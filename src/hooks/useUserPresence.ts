import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUsersStore } from '@/stores/usersStore';
import { useAuthStore } from '@/stores/authStore';

export function useUserPresence() {
  const { user, token } = useAuthStore();
  const userId = user?.id || null;
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { updateUserStatus } = useUsersStore();

  useEffect(() => {
    if (!userId || !token) return;

    // Connect to WebSocket - use relative URL for proxy
    const socketUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4000'
      : window.location.origin;

    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { token }, // Pass JWT token for authentication
    });

    socketRef.current = socket;

    // When connected, send login event
    socket.on('connect', () => {
      console.log('✅ Connected to presence server');
      socket.emit('user-login'); // No need to send userId - it comes from JWT

      // Send heartbeat every 30 seconds
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        socket.emit('heartbeat'); // No need to send userId - it comes from JWT
      }, 30000);
    });

    // Listen for other users' status changes
    socket.on('user-status-changed', (data: { userId: string; isOnline: boolean; lastLogoutAt: Date | null }) => {
      console.log(`📡 User status changed:`, data);
      updateUserStatus(data.userId, data.isOnline, data.lastLogoutAt);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from presence server');
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (socketRef.current) {
        socket.emit('user-logout'); // No need to send userId - it comes from JWT
        socket.disconnect();
      }
    };
  }, [userId, token, updateUserStatus]);

  return socketRef.current;
}
