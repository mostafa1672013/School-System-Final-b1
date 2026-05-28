# نظام تتبع حالة الاتصال في الوقت الفعلي - Real-time User Presence

## ماذا تم تنفيذه؟

تم إضافة نظام تتبع حالة الاتصال/عدم الاتصال لجميع المستخدمين **في الوقت الفعلي** في صفحة إدارة المستخدمين.

## الميزات

✅ عرض حالة الاتصال (متصل/غير متصل) لكل مستخدم  
✅ تحديث فوري عند تسجيل الدخول/الخروج  
✅ عرض آخر وقت تسجيل خروج  
✅ مؤشر بصري (نقطة خضراء للمتصلين، رمادية للمعطلين)  
✅ مؤشر Pulse animation للمستخدمين المتصلين

---

## كيفية البدء

### 1️⃣ بدء الـ Backend (port 4000)

```bash
cd server
npm run dev
# أو
npm run start
```

تأكد من أن المتغيرات البيئية محددة (DATABASE_URL, etc.)

### 2️⃣ بدء الـ Frontend (port 8080)

```bash
npm run dev
```

### 3️⃣ اختبر النظام

1. افتح صفحة **إدارة المستخدمين**
2. سجل الدخول بحساب مستخدم
3. افتح صفحة إدارة المستخدمين في علامة تبويب أخرى/متصفح آخر
4. سجل الدخول بحساب آخر
5. لاحظ أن الحالة تتحدث فوراً في كلا الصفحتين

---

## الآلية الفنية

### Backend (Socket.io Server)

```
server/src/index.ts
├── إنشاء Socket.IO server على نفس port Express
├── معالجة الأحداث:
│   ├── user-login: عند دخول مستخدم
│   ├── heartbeat: كل 30 ثانية للتأكد من الاتصال
│   ├── user-logout: عند تسجيل الخروج
│   └── disconnect: عند قطع الاتصال
└── بث حدث user-status-changed لجميع العملاء
```

### Frontend (React Hook)

```
src/hooks/useUserPresence.ts
├── الاتصال بـ WebSocket عند تسجيل الدخول
├── إرسال heartbeat كل 30 ثانية
├── الاستماع لتحديثات حالة المستخدمين
├── تحديث المتجر (Zustand)
└── الانقطاع عند تسجيل الخروج
```

### المتجر (Zustand)

```
src/stores/usersStore.ts
├── updateUserStatus(): تحديث حالة مستخدم معين
└── تحديث قائمة المستخدمين فوراً
```

---

## البيانات المرسلة

### من الـ Frontend للـ Backend

```javascript
// عند الدخول
socket.emit('user-login', userId);

// كل 30 ثانية
socket.emit('heartbeat', userId);

// عند الخروج
socket.emit('user-logout', userId);
```

### من الـ Backend للـ Frontend

```javascript
// بث لجميع المتصلين
io.emit('user-status-changed', {
  userId: string,
  isOnline: boolean,
  lastLogoutAt: string | null
});
```

---

## التخزين المؤقت (In-Memory)

تتبع حالة الاتصال يتم **في الذاكرة فقط** (Map):

```javascript
const userSockets = new Map<string, {
  userId: string;
  socketId: string;
  connectTime: Date;
}>();
```

هذا يعني:
- ✅ تحديث فوري جداً
- ✅ لا حاجة لطلبات API متكررة
- ⚠️ البيانات تُفقد عند إعادة تشغيل الـ Server

---

## المتطلبات

- ✅ `socket.io@^4.8.3`
- ✅ `socket.io-client@^4.8.3`
- ✅ Node.js + Express server
- ✅ React + Zustand

---

## قد تواجه

### ❌ "الاتصال مرفوض؟"

- تأكد من أن الـ Backend يعمل على port 4000
- تحقق من CORS في Backend:
  ```typescript
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  ```

### ❌ "الحالة لا تتحدث؟"

- افتح console (F12) وتحقق من رسائل الخطأ
- تأكد من أن `sessionStorage.getItem('userId')` يعيد قيمة صحيحة
- تحقق من اتصال WebSocket في Network tab

### ❌ "لا ترى heartbeat في logs؟"

- الـ heartbeat يُرسل كل 30 ثانية - انتظر قليلاً
- لا بأس إذا لم ترها - فهي فقط للحفاظ على الاتصال

---

## التحسينات المستقبلية

- [ ] حفظ حالة الاتصال في Database لاستعادتها بعد إعادة التشغيل
- [ ] إرسال آخر وقت نشاط فعلي (بدلاً من وقت الخروج فقط)
- [ ] عرض عدد المستخدمين المتصلين حالياً
- [ ] إشعارات عند تسجيل دخول/خروج مستخدمين محددين

---

## ملفات معدّلة/مضافة

```
✅ server/src/index.ts (Socket.io + handlers)
✅ src/hooks/useUserPresence.ts (Hook جديد)
✅ src/stores/usersStore.ts (إضافة updateUserStatus)
✅ src/pages/Users.tsx (استخدام Hook)
✅ src/types/index.ts (تحديث User interface)
✅ vite.config.ts (إضافة proxy للـ WebSocket)
```
