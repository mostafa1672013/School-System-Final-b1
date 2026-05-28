import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useIdleLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityRef = useRef<boolean>(false);

  // Reset the idle timer on activity
  const resetTimer = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only set a new timeout if user is authenticated
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Idle timeout reached - logging out');
        logout();
      }, IDLE_TIMEOUT);
    }

    activityRef.current = true;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timeout if user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Set initial timeout when user logs in
    resetTimer();

    // Activity events to listen for
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Create a debounced handler to avoid too many timer resets
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (!debounceTimer) {
        debounceTimer = setTimeout(() => {
          resetTimer();
          debounceTimer = null;
        }, 1000); // Debounce activity detection to every 1 second
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, logout]);

  return null;
}
