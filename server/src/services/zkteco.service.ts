// @ts-ignore
import ZKLib from 'zkteco-js';

class ZktecoService {
  private getIp(): string {
    return process.env.ZKTECO_IP || '192.168.1.201';
  }

  private getPort(): number {
    return parseInt(process.env.ZKTECO_PORT || '4370');
  }

  /**
   * تنفيذ دالة مع مهلة زمنية قصوى (Timeout Wrapper)
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT: استغرق جهاز البصمة وقتاً طويلاً في الاستجابة')), timeoutMs)
      ),
    ]);
  }

  /**
   * الآلية: اتصال -> تنفيذ -> فصل
   */
  private async executeCommand<T>(commandName: string, action: (zkInstance: any) => Promise<T>): Promise<T> {
    const ip = this.getIp();
    const port = this.getPort();
    console.log(`[ZKTeco] محاولة الاتصال الفعلي بالماكينة (${ip}:${port}) لتنفيذ: ${commandName}...`);
    const zkInstance = new ZKLib(ip, port, 10000, 4000);
    
    try {
      await this.withTimeout(zkInstance.createSocket(), 10000);
      const result = await action(zkInstance);
      return result;
    } catch (error: any) {
      console.error(`[ZKTeco Error] in ${commandName}:`, error.message || error);
      throw error;
    } finally {
      try {
        await zkInstance.disconnect();
        console.log(`[ZKTeco] تم فصل الاتصال بنجاح بعد: ${commandName}`);
      } catch (err) {
        // Ignore disconnect errors
      }
    }
  }

  async pingDevice(): Promise<boolean> {
    try {
      return await this.executeCommand('pingDevice', async (zk) => {
        await this.withTimeout(zk.getTime(), 5000);
        return true;
      });
    } catch (error: any) {
      console.error('❌ فشل الاتصال بجهاز البصمة الحقيقي:', error.message || error);
      throw new Error('فشل الاتصال بجهاز البصمة الحقيقي');
    }
  }

  async forceReconnect(): Promise<boolean> {
    console.log('[ZKTeco] 🔄 إعادة محاولة الاتصال بالماكينة الحقيقية...');
    return this.pingDevice();
  }

  async getNextDeviceId(): Promise<number> {
    try {
      return await this.executeCommand('getNextDeviceId', async (zk) => {
        const users: any = await this.withTimeout(zk.getUsers(), 30000);
        if (!users || !users.data || users.data.length === 0) {
          return 1;
        }
        const ids = users.data
          .map((u: any) => parseInt(u.userId))
          .filter((id: number) => !isNaN(id));
        
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        return maxId + 1;
      });
    } catch (error: any) {
      console.error('❌ فشل الاتصال بجهاز البصمة الحقيقي في getNextDeviceId:', error.message || error);
      throw new Error('فشل الاتصال بجهاز البصمة الحقيقي');
    }
  }

  /**
   * سحب سجلات الحضور من جهاز البصمة مع معالجة أخطاء محسّنة
   * يُرجع مصفوفة من السجلات مع ضمان أن كل سجل يحتوي على user_id و record_time
   */
  async getAttendanceLogs(): Promise<any[]> {
    try {
      return await this.executeCommand('getAttendanceLogs', async (zk) => {
        console.log('[ZKTeco] بدء سحب سجلات البصمة من الجهاز الحقيقي...');
        
        try {
          const logs: any = await this.withTimeout(zk.getAttendances(), 60000);
          
          if (!logs) {
            console.warn('[ZKTeco] ⚠️ الجهاز أرجع null/undefined');
            return [];
          }

          const rawData = logs.data || [];

          if (!Array.isArray(rawData)) {
            console.warn('[ZKTeco] ⚠️ البيانات المرجعة ليست مصفوفة:', typeof rawData);
            return [];
          }

          console.log(`[ZKTeco] ✅ تم استلام ${rawData.length} سجل بصمة خام من الجهاز`);

          const validLogs: any[] = [];
          let skippedCount = 0;

          for (const log of rawData) {
            const userId = log.user_id || log.userId;
            const recordTime = log.record_time || log.recordTime;

            if (!userId || !recordTime) {
              skippedCount++;
              continue;
            }

            validLogs.push(log);
          }

          if (skippedCount > 0) {
            console.warn(`[ZKTeco] ⚠️ تم تخطي ${skippedCount} سجل لعدم وجود user_id أو record_time`);
          }

          console.log(`[ZKTeco] ✅ إجمالي السجلات الصالحة: ${validLogs.length}`);
          return validLogs;
        } catch (error: any) {
          console.error('[ZKTeco] ❌ فشل سحب سجلات البصمة:', error.message || error);
          if (error.message && error.message.includes('out of range')) {
            console.log('[ZKTeco] 🔄 إعادة المحاولة بسبب خطأ RangeError في المكتبة...');
            try {
              const retryLogs: any = await this.withTimeout(zk.getAttendances(), 60000);
              const retryData = retryLogs?.data || [];
              console.log(`[ZKTeco] ✅ المحاولة الثانية: تم استلام ${retryData.length} سجل`);
              return Array.isArray(retryData) ? retryData : [];
            } catch (retryError: any) {
              console.error('[ZKTeco] ❌ فشلت المحاولة الثانية أيضاً:', retryError.message || retryError);
              throw retryError;
            }
          }
          throw error;
        }
      });
    } catch (error: any) {
      console.error('❌ فشل الاتصال بجهاز البصمة الحقيقي في getAttendanceLogs:', error.message || error);
      throw new Error('فشل الاتصال بجهاز البصمة الحقيقي');
    }
  }

  async checkUserExists(userId: number): Promise<boolean> {
    try {
      return await this.executeCommand('checkUserExists', async (zk) => {
        const users: any = await this.withTimeout(zk.getUsers(), 30000);
        if (!users || !users.data) return false;
        return users.data.some((u: any) => parseInt(u.userId) === userId);
      });
    } catch (error: any) {
      console.error('❌ فشل الاتصال بجهاز البصمة الحقيقي في checkUserExists:', error.message || error);
      throw new Error('فشل الاتصال بجهاز البصمة الحقيقي');
    }
  }

  async getAllUsers(): Promise<number[]> {
    try {
      return await this.executeCommand('getAllUsers', async (zk) => {
        const users: any = await this.withTimeout(zk.getUsers(), 30000);
        if (!users || !users.data) return [];
        return users.data.map((u: any) => parseInt(u.userId)).filter((id: number) => !isNaN(id));
      });
    } catch (error: any) {
      console.error('❌ فشل الاتصال بجهاز البصمة الحقيقي في getAllUsers:', error.message || error);
      throw new Error('فشل الاتصال بجهاز البصمة الحقيقي');
    }
  }

  async clearAttendanceLogs() {
    try {
      return await this.executeCommand('clearAttendanceLogs', async (zk) => {
        await this.withTimeout(zk.clearAttendanceLog(), 10000);
      });
    } catch (error: any) {
      console.error('❌ فشل الاتصال بجهاز البصمة الحقيقي في clearAttendanceLogs:', error.message || error);
      throw new Error('فشل الاتصال بجهاز البصمة الحقيقي');
    }
  }
}

export const zktecoService = new ZktecoService();
