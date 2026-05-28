# 📚 نظام إدارة المدرسة - School Management System

## 📋 نظرة عامة

هذا مشروع **نظام إدارة شامل للمدرسة** يوفر منصة متكاملة لإدارة جميع عمليات المدرسة من القبول إلى الدفع والمصروفات والمستودع والحافلات والتقارير.

**الحالة:** 🔄 قيد التطوير (يحتوي على عدة ميزات مستكملة وأخرى قيد الإنجاز)

---

## 🏗️ البنية المعمارية

المشروع يتبع **معمارية Full-Stack** مع فصل كامل بين Frontend و Backend:

```
project/
├── src/                          # Frontend (React + Vite)
│   ├── pages/                   # الصفحات الرئيسية
│   ├── components/              # المكونات القابلة لإعادة الاستخدام
│   ├── stores/                  # حالة التطبيق (Zustand/Redux)
│   ├── hooks/                   # React Hooks مخصصة
│   ├── lib/                     # دوال مساعدة
│   └── types/                   # تعريفات TypeScript
├── server/                       # Backend (Express + Node.js)
│   ├── src/
│   │   └── index.ts            # نقطة البداية للسيرفر
│   ├── prisma/
│   │   └── schema.prisma       # نموذج قاعدة البيانات
│   └── package.json
├── package.json                 # تبعيات Frontend
└── vite.config.ts              # إعدادات Vite
```

---

## 🎨 الصفحات الرئيسية (Pages)

### 1. **المصادقة (Authentication)**
- **Login** - صفحة تسجيل الدخول
- **Profile** - ملف المستخدم الشخصي

### 2. **إدارة الطلاب (Students Management)**
- **Students** - قائمة الطلاب
- **StudentDetail** - تفاصيل الطالب الفردي

### 3. **القبول (Admission)**
- **Admission** - قائمة طلبات القبول
- **NewAdmission** - إضافة طلب قبول جديد

### 4. **الدفع والرسوم (Payment & Fees)**
- **Payments** - تسجيل المدفوعات
- **PaymentApprovals** - الموافقة على المدفوعات
- **StageFeeManagement** - إدارة رسوم المراحل الدراسية
- **NewStageFee** - إضافة رسوم مرحلة جديدة

### 5. **الخصومات (Discount Management)**
- **DiscountApprovals** - الموافقة على الخصومات
- **DiscountSettings** - إعدادات الخصومات

### 6. **المصروفات والحسابات (Expenses & Accounting)**
- **Expenses** - تسجيل المصروفات
- **ExpenseApprovals** - الموافقة على المصروفات
- **ExpensePermissions** - صلاحيات المصروفات
- **ChartOfAccounts** - دليل الحسابات

### 7. **العمليات الأخرى**
- **Dashboard** - لوحة التحكم الرئيسية
- **Users** - إدارة المستخدمين
- **BusManagement** - إدارة الحافلات والمسارات
- **Inventory** - إدارة المستودع
- **Reports** - التقارير والإحصائيات

---

## 📊 نموذج قاعدة البيانات (Database Schema)

### الجداول الرئيسية:

#### 1. **Student** (الطالب)
```prisma
- id (UUID)
- nationalId (معرّف فريد)
- name, photoUrl
- stage, grade, track (local/international)
- academicYear
- guardian info (guardianName, guardianPhone)
- status (applied, under_testing, fee_setup, pending_approval, admitted)
- fees (tuition, books, uniform, bus, other)
- payments & discounts tracking
- documents & extraFields (JSON)
```

#### 2. **StageFee** (رسوم المرحلة)
```prisma
- stage, grade, track, academicYear
- tuitionFees, booksFees, uniformFees, applicationFees
- mandatory/optional flags لكل رسم
- additionalFees (JSON)
```

#### 3. **Payment** (المدفوعات)
```prisma
- studentId, amount, type, method
- receiptNumber (فريد)
- collectedBy, academicYear
- walletPhoneNumber (للدفع عبر المحافظ)
```

#### 4. **InstallmentPlan** (خطط التقسيط)
#### 5. **StudentYearlyFinance** (المالية السنوية)
#### 6. **User** (المستخدمون)
#### 7. **Bus, BusStop, BusRoute** (الحافلات)
#### 8. **Inventory, InventoryItem** (المستودع)
#### 9. **Account** (الحسابات المحاسبية)
#### 10. **Expense** (المصروفات)

---

## 🛠️ التقنيات المستخدمة

### Frontend Stack
| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| **React** | 18.3.1 | مكتبة UI الرئيسية |
| **Vite** | 5.4.1 | بناء وتطوير سريع |
| **TypeScript** | 5.5.3 | الأمان والأنواع |
| **Tailwind CSS** | 3.4.11 | Styling |
| **Shadcn UI** | Latest | مكونات UI متقدمة |
| **React Router** | 6.26.2 | التوجيه |
| **Redux Toolkit** | 2.9.0 | إدارة الحالة |
| **Zustand** | 5.0.8 | إدارة حالة بديلة |
| **React Hook Form** | 7.53.0 | إدارة النماذج |
| **React Query** | 5.56.2 | جلب البيانات |
| **Zod** | 3.23.8 | تحقق من البيانات |

### Backend Stack
| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| **Express** | 5.2.1 | Web framework |
| **Prisma** | 6.19.3 | ORM |
| **PostgreSQL** | 16 | قاعدة البيانات |
| **Node.js** | - | بيئة التشغيل |

### المكتبات الإضافية
- **Chart.js & Recharts** - الرسوم البيانية 📊
- **Three.js** - الرسومات ثلاثية الأبعاد 🎨
- **Leaflet** - الخرائط 🗺️
- **jsPDF** - إنشاء ملفات PDF 📄
- **XLSX** - تصدير/استيراد Excel 📑
- **QR Code** - توليد رموز QR 
- **Stripe** - معالجة الدفع 💳
- **Google Generative AI** - تكامل AI 🤖
- **Framer Motion** - الرسوم المتحركة ✨

---

## ▶️ كيفية التشغيل

### المتطلبات
- **Node.js & npm** (مثبتة)
- **Docker** (لتشغيل PostgreSQL)

### خطوات التشغيل

#### 1️⃣ تشغيل قاعدة البيانات
```bash
docker compose up -d
```

#### 2️⃣ تثبيت المكتبات
```bash
npm install
```

#### 3️⃣ تشغيل التطوير (Frontend + Backend معاً)
```bash
npm run dev
```
✅ **النتيجة:** سيفتح تلقائياً:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

### أوامر إضافية
```bash
npm run client          # تشغيل الواجهة فقط
npm run server          # تشغيل السيرفر فقط
npm run build           # بناء الإنتاج
npm run lint            # فحص الأخطاء
npm run deploy          # نشر على GitHub Pages
```

---

## 🔒 نظام الأمان والمصادقة

### ProtectedRoute
- جميع الصفحات (ما عدا Login) محمية بـ `ProtectedRoute`
- التحقق من توجود جلسة نشطة قبل السماح بالوصول
- إعادة توجيه تلقائية إلى Login في حالة عدم وجود صلاحيات

### Role-Based Access Control
- الصلاحيات مرتبطة بـ User roles
- بعض الصفحات تتطلب صلاحيات معينة (مثل Approval pages)

---

## 📁 هيكل المجلدات الهام

```
src/
├── pages/                      # 23 صفحة رئيسية
├── components/
│   ├── layout/                # AppLayout, Sidebar, Header
│   ├── features/              # مكونات متخصصة (StudentForm, etc)
│   └── ui/                    # مكونات Shadcn UI
├── stores/                     # Zustand/Redux stores
│   ├── authStore.ts           # المصادقة
│   ├── studentsStore.ts       # الطلاب
│   ├── paymentsStore.ts       # المدفوعات
│   ├── admissionStore.ts      # القبول
│   ├── busStore.ts            # الحافلات
│   ├── inventoryStore.ts      # المستودع
│   ├── usersStore.ts          # المستخدمون
│   └── accountingStore.ts     # الحسابات
├── hooks/                      # Custom React Hooks
│   ├── usePrintReceipt.ts     # طباعة الإيصالات
│   ├── usePrintExpenseVoucher.ts
│   └── ...
├── lib/                        # دوال مساعدة
├── types/                      # تعريفات TypeScript
└── components/layout/
    └── ProtectedRoute.tsx     # حماية الصفحات

server/
├── src/
│   ├── index.ts               # API endpoints
│   ├── accounting-api.ts      # API المحاسبة
│   └── seed-accounts.ts       # بيانات وهمية
└── prisma/
    └── schema.prisma          # نموذج DB
```

---

## 🔄 التدفق الأساسي

```
المستخدم (Browser)
        ↓
React App (Frontend) ← Vite (Dev Server)
        ↓
API Requests (Axios/React Query)
        ↓
Express Server (Backend)
        ↓
Prisma ORM
        ↓
PostgreSQL Database
```

---

## 🚀 الميزات الرئيسية

### ✅ المكتملة
- ✔️ نظام تسجيل دخول وتسجيل خروج
- ✔️ إدارة بيانات الطلاب
- ✔️ تسجيل المدفوعات والإيصالات
- ✔️ إدارة رسوم المراحل
- ✔️ إدارة الخصومات والموافقات
- ✔️ إدارة الحافلات والمسارات
- ✔️ إدارة المستودع
- ✔️ إدارة المستخدمين والصلاحيات
- ✔️ طباعة الإيصالات والتقارير

### 🔄 قيد التطوير
- 🔨 نظام المصروفات والحسابات
- 🔨 لوحة التحكم (Dashboard) المتقدمة
- 🔨 التقارير الشاملة
- 🔨 تكاملات الدفع (Stripe)

---

## 📝 ملاحظات التطوير

### ملفات قيد الإنجاز
- `server/src/accounting-api.ts` - API المحاسبة
- `server/src/seed-accounts.ts` - بيانات الحسابات الوهمية
- `src/pages/ExpenseApprovals.tsx`
- `src/pages/ExpensePermissions.tsx`
- `src/pages/ChartOfAccounts.tsx`

### ملفات اختبار
- `test.js` - اختبارات عامة
- `test-payment.js` - اختبارات المدفوعات

### معايير التطوير
- ✅ TypeScript صارم
- ✅ Tailwind CSS + Shadcn UI للتصميم
- ✅ RTL (Right-to-Left) للنصوص العربية
- ✅ Error Boundaries للأخطاء
- ✅ Lazy Loading للصفحات

---

## 🌐 الأوضاع المختلفة

### الطلاب:
- **Track**: Local (محلي) / International (دولي)
- **Status**: Applied → Under Testing → Fee Setup → Pending Approval → Admitted
- **Stage**: Primary, Middle, Secondary, etc.

### الرسوم:
- **Tuition** (الرسوم الدراسية)
- **Books** (الكتب)
- **Uniform** (الزي المدرسي)
- **Application** (رسم القبول)
- **Bus** (المواصلات)

### المدفوعات:
- **Methods**: Cash, Online, Wallet, etc.
- **Types**: Full, Partial, Installment

---

## 🔗 روابط مفيدة

- **Frontend Dev**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: PostgreSQL via Docker
- **Deployment**: GitHub Pages (مُعد مسبقاً)

---

## 👤 المساهمون

**آخر كمميت:** `fess setup` (إعداد الرسوم)

---

## 📝 ملاحظات ختامية

هذا المشروع يوفر **منصة متكاملة وقابلة للتوسع** لإدارة جميع جوانب المدرسة. البنية المعمارية سليمة وتتبع أفضل الممارسات في React و Backend development.

### التحسينات المستقبلية المقترحة:
1. إكمال نظام المصروفات والحسابات
2. تطوير لوحة تحكم متقدمة مع إحصائيات شاملة
3. إضافة نظام إخطارات عبر البريد الإلكتروني
4. تحسين الأداء والتخزين المؤقت (Caching)
5. إضافة نظام التدقيق (Audit Log)
6. تطبيق Mobile متوافق

---

**تاريخ التحديث:** 2026-05-17  
**اللغة:** العربية + English  
**الترخيص:** ISC
