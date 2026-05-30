# خريطة UML الشاملة — نظام إدارة المدرسة

> **للعاملين بالنظام:** هذا المستند تحليلي بحت — يصف النظام كما هو بعيون المستخدم النهائي. لا يحتوي على كود تنفيذي.

**الهدف:** رسم خريطة UML كاملة للنظام تغطي جميع العمليات من منظور المستخدم النهائي، تُستخدم كمرجع لاتخاذ قرارات التطوير والتحسين.

**المنهجية:** التحليل من منظور المستخدم — "ماذا أريد أن أفعل؟" لا "كيف يعمل الكود؟"

---

## 1. مخطط حالات الاستخدام — Use Case Diagram

### الممثلون (Actors)

```
┌──────────────────────────────────────────────────────────────────┐
│                        ACTORS                                     │
├────────────────┬──────────────────────────────────────────────────┤
│ مدير النظام    │ صلاحيات كاملة — يرى كل شيء ويوافق على كل شيء  │
│ (Admin)        │                                                  │
├────────────────┼──────────────────────────────────────────────────┤
│ محاسب          │ يدير الحسابات، القيود، تقارير، يوافق مصروفات    │
│ (Accountant)   │                                                  │
├────────────────┼──────────────────────────────────────────────────┤
│ كاشير / خزينة  │ يفتح/يغلق الخزينة، يسجل مدفوعات، يستلم نقد    │
│ (Cashier)      │                                                  │
├────────────────┼──────────────────────────────────────────────────┤
│ موظف قبول      │ يضيف طلاب جدد، يتابع القبول، يدير الرسوم       │
│ (Admission)    │                                                  │
├────────────────┼──────────────────────────────────────────────────┤
│ موظف مستودع    │ يدير المواد، الشراء، التوزيع على الطلاب         │
│ (Inventory)    │                                                  │
└────────────────┴──────────────────────────────────────────────────┘
```

### حالات الاستخدام بالوحدات

```mermaid
graph LR
  subgraph AUTH["🔐 المصادقة"]
    UC1[تسجيل الدخول]
    UC2[تسجيل الخروج]
    UC3[تعديل الملف الشخصي]
  end

  subgraph STUDENTS["👨‍🎓 الطلاب"]
    UC4[عرض قائمة الطلاب]
    UC5[إضافة طالب جديد]
    UC6[تعديل بيانات الطالب]
    UC7[عرض تفاصيل الطالب]
    UC8[عرض كشف الحساب]
    UC9[ترقية الطلاب للمرحلة التالية]
    UC10[أرشفة طالب / تخرج]
  end

  subgraph ADMISSION["📋 القبول"]
    UC11[تقديم طلب قبول جديد]
    UC12[مراجعة طلبات القبول]
    UC13[ربط الطالب برسوم المرحلة]
    UC14[الموافقة على القبول]
  end

  subgraph FEES["💰 الرسوم"]
    UC15[عرض رسوم المراحل]
    UC16[إضافة / تعديل رسوم مرحلة]
    UC17[إدارة الرسوم الإضافية]
  end

  subgraph PAYMENTS["💳 المدفوعات"]
    UC18[تسجيل دفعة لطالب]
    UC19[طلب الموافقة على دفعة]
    UC20[الموافقة على دفعة]
    UC21[طباعة إيصال]
    UC22[إنشاء خطة تقسيط]
    UC23[متابعة أقساط الطالب]
  end

  subgraph DISCOUNT["🏷️ الخصومات"]
    UC24[طلب خصم لطالب]
    UC25[الموافقة / رفض خصم]
    UC26[إعدادات حدود الخصم]
    UC27[ربط شارة بطالب للخصم التلقائي]
  end

  subgraph TREASURY["🏦 الخزينة"]
    UC28[فتح جلسة الخزينة]
    UC29[متابعة الرصيد اليومي]
    UC30[إغلاق الخزينة]
    UC31[الموافقة على إغلاق الخزينة]
    UC32[طلب إعادة فتح الخزينة]
    UC33[إيداع مبلغ في البنك]
    UC34[الموافقة على الإيداع البنكي]
    UC35[عرض تاريخ جلسات الخزينة]
  end

  subgraph EXPENSES["📊 المصروفات"]
    UC36[تسجيل مصروف جديد]
    UC37[الموافقة على مصروف]
    UC38[رفض مصروف]
    UC39[دفع مصروف من الخزينة]
    UC40[إدارة صلاحيات المصروفات]
  end

  subgraph ACCOUNTING["📚 المحاسبة"]
    UC41[عرض دليل الحسابات]
    UC42[إضافة حساب جديد]
    UC43[إنشاء قيد يومي]
    UC44[الموافقة على قيد / ترحيل]
    UC45[إدارة الفترات المحاسبية]
    UC46[عرض التقارير المحاسبية]
    UC47[إغلاق السنة المحاسبية]
  end

  subgraph BUS["🚌 الحافلات"]
    UC48[إدارة مسارات الحافلات]
    UC49[اشتراك طالب في مسار]
    UC50[تغيير / إلغاء اشتراك]
    UC51[إدارة شركات الإيجار]
    UC52[إدارة عقود الإيجار]
    UC53[فواتير شركات الإيجار]
  end

  subgraph INVENTORY["📦 المستودع"]
    UC54[عرض / إدارة المواد]
    UC55[إضافة مورد]
    UC56[طلب شراء]
    UC57[الموافقة على طلب شراء]
    UC58[أمر شراء]
    UC59[استلام بضاعة]
    UC60[دفع فاتورة مورد]
  end

  subgraph DISTRIBUTION["📬 التوزيع على الطلاب"]
    UC61[إنشاء قائمة مواد للصف]
    UC62[إنشاء أمر تسليم لطالب]
    UC63[تأكيد التسليم]
    UC64[عرض تقرير التوزيع]
  end

  subgraph USERS["👥 المستخدمون"]
    UC65[إضافة مستخدم]
    UC66[تعديل دور / صلاحيات]
    UC67[تعطيل / حذف مستخدم]
    UC68[إعادة تعيين كلمة المرور]
  end

  subgraph REPORTS["📈 التقارير"]
    UC69[تقارير المدفوعات]
    UC70[تقارير الطلاب]
    UC71[تقارير المستودع]
    UC72[سجل التدقيق]
    UC73[تقرير نهاية العام]
  end
```

---

## 2. نموذج المجال — Domain Model (Class Diagram)

```mermaid
classDiagram
  direction TB

  class User {
    +id: UUID
    +name: String
    +email: String
    +role: String
    +active: Boolean
    +discountLimitPercent: Decimal
    +permissions: UserPermission[]
  }

  class Student {
    +id: UUID
    +nationalId: String
    +name: String
    +stage: String
    +grade: String
    +track: local|international
    +academicYear: String
    +status: StudentStatus
    +tuitionFees: Decimal
    +booksFees: Decimal
    +uniformFees: Decimal
    +busFees: Decimal
    +totalFees: Decimal
    +paidAmount: Decimal
    +discountAmount: Decimal
    +arrearsFees: Decimal
  }

  class StageFee {
    +stage: String
    +grade: String
    +track: String
    +academicYear: String
    +tuitionFees: Decimal
    +booksFees: Decimal
    +uniformFees: Decimal
    +applicationFees: Decimal
  }

  class Payment {
    +id: UUID
    +studentId: UUID
    +amount: Decimal
    +type: String
    +method: String
    +receiptNumber: String
    +date: DateTime
    +sessionId: UUID
  }

  class InstallmentPlan {
    +studentId: UUID
    +totalAmount: Decimal
    +academicYear: String
    +status: active|completed
    +installments: Installment[]
  }

  class Installment {
    +planId: UUID
    +amount: Decimal
    +dueDate: String
    +paidAmount: Decimal
    +status: pending|partial|paid
  }

  class Badge {
    +name: String
    +discountPercentage: Decimal
    +color: String
  }

  class TreasurySession {
    +date: String
    +openingBalance: Decimal
    +closingBalance: Decimal
    +actualBalance: Decimal
    +status: open|pending_close|closed
    +openedBy: String
    +closedBy: String
  }

  class BankDeposit {
    +amount: Decimal
    +bankAccountId: UUID
    +sessionId: UUID
    +status: pending|approved
  }

  class Expense {
    +amount: Decimal
    +description: String
    +accountId: UUID
    +paymentMethod: String
    +status: ExpenseStatus
    +requestedBy: String
    +approvedBy: String
    +sessionId: UUID
  }

  class Account {
    +code: String
    +name: String
    +type: asset|liability|equity|income|expense
    +parentId: UUID
    +normalBalance: debit|credit
    +isSystemAccount: Boolean
  }

  class JournalEntry {
    +entryNumber: String
    +entryDate: String
    +description: String
    +status: draft|approved|posted
    +lines: JournalEntryLine[]
  }

  class JournalEntryLine {
    +accountId: UUID
    +debit: Decimal
    +credit: Decimal
    +costCenterId: UUID
  }

  class FiscalYear {
    +yearCode: String
    +startDate: String
    +endDate: String
    +status: active|closed
    +periods: AccountingPeriod[]
  }

  class AccountingPeriod {
    +periodCode: String
    +fiscalYearId: UUID
    +status: open|closed
  }

  class BusRoute {
    +name: String
    +driverName: String
    +busNumber: String
    +capacity: Int
    +monthlyFee: Decimal
    +annualFee: Decimal
  }

  class BusSubscription {
    +studentId: UUID
    +routeId: UUID
    +academicYear: String
    +status: active|cancelled|suspended
    +actualAmount: Decimal
  }

  class RentalCompany {
    +name: String
    +contactPerson: String
    +isActive: Boolean
  }

  class RentalContract {
    +contractNumber: String
    +companyId: UUID
    +monthlyFeePerBus: Decimal
    +busesCount: Int
    +status: active|expired
  }

  class Supplier {
    +code: String
    +name: String
    +isActive: Boolean
  }

  class PurchaseRequest {
    +requestedBy: String
    +status: pending_approval|approved|rejected
    +items: PurchaseRequestItem[]
  }

  class PurchaseOrder {
    +supplierId: UUID
    +totalAmount: Decimal
    +status: issued|received|cancelled
  }

  class GoodsReceipt {
    +supplierId: UUID
    +orderId: UUID
    +receivedBy: String
  }

  class InventoryItem {
    +name: String
    +category: String
    +quantity: Int
    +unitPrice: Decimal
    +unitCost: Decimal
    +itemType: consumable|durable
  }

  class DeliveryOrder {
    +studentId: UUID
    +academicYear: String
    +term: String
    +status: pending|confirmed|delivered
    +chargeType: within_fees|extra_charge
    +totalAmount: Decimal
  }

  class GradeItemList {
    +stage: String
    +grade: String
    +academicYear: String
    +term: String
    +entries: GradeItemListEntry[]
  }

  class StudentYearlyFinance {
    +studentId: UUID
    +academicYear: String
    +totalFees: Decimal
    +paidAmount: Decimal
    +arrearsFees: Decimal
  }

  class AuditLog {
    +userId: UUID
    +action: String
    +entityType: String
    +before: JSON
    +after: JSON
  }

  %% Relations
  User "1" --> "*" Payment : يسجل
  User "1" --> "*" Expense : يطلب / يوافق
  Student "1" --> "*" Payment : له
  Student "1" --> "0..1" InstallmentPlan : له
  InstallmentPlan "1" --> "*" Installment : يحتوي
  Student "1" --> "0..1" Badge : يحمل
  Badge "1" --> "*" Student : ينطبق على
  Student "1" --> "*" BusSubscription : مشترك في
  BusRoute "1" --> "*" BusSubscription : يحتوي
  RentalCompany "1" --> "*" RentalContract : لديها
  RentalContract "1" --> "*" FleetBus : تشمل
  TreasurySession "1" --> "*" Payment : تسجل
  TreasurySession "1" --> "*" Expense : تدفع
  TreasurySession "1" --> "*" BankDeposit : تودع
  Account "1" --> "*" JournalEntryLine : يظهر في
  Account "1" --> "*" Expense : مرتبط بـ
  Account "0..1" --> "*" Account : أب لـ
  JournalEntry "1" --> "*" JournalEntryLine : يتكون من
  FiscalYear "1" --> "*" AccountingPeriod : يقسّم إلى
  AccountingPeriod "1" --> "*" JournalEntry : تحتوي
  Supplier "1" --> "*" PurchaseRequest : لديه
  Supplier "1" --> "*" PurchaseOrder : لديه
  PurchaseOrder "1" --> "*" GoodsReceipt : ينتج
  InventoryItem "1" --> "*" GradeItemListEntry : يظهر في
  GradeItemList "1" --> "*" GradeItemListEntry : تحتوي
  Student "1" --> "*" DeliveryOrder : له
  DeliveryOrder "1" --> "*" DeliveryOrderItem : يحتوي
  Student "1" --> "*" StudentYearlyFinance : له
```

---

## 3. مخطط حالات الطالب — Student Lifecycle State Diagram

```mermaid
stateDiagram-v2
  [*] --> applied : تقديم طلب القبول

  applied --> under_testing : استلام الطلب وتحديد موعد الاختبار
  note right of applied
    الطالب لم يُقبل بعد
    يمكن تعديل بياناته
  end note

  under_testing --> fee_setup : اجتياز الاختبار / قبول الإدارة
  under_testing --> rejected : رسوب في الاختبار / رفض إداري

  fee_setup --> pending_approval : ربط الطالب برسوم المرحلة وتقديم للموافقة
  note right of fee_setup
    يُختار مرحلة + صف + مسار
    تُجلب الرسوم تلقائياً من StageFee
  end note

  pending_approval --> admitted : موافقة المدير على القبول
  pending_approval --> fee_setup : إعادة الطلب لمراجعة الرسوم

  admitted --> active : بدء العام الدراسي / أول دفعة
  note right of admitted
    الطالب مقبول رسمياً
    يمكن تسجيل المدفوعات
    يمكن منح خصومات
  end note

  active --> active : دفع قسط / تسديد جزئي
  active --> promoted : ترقية للصف التالي (نهاية العام)
  active --> graduated : إتمام المرحلة الأخيرة
  active --> transferred : نقل لمدرسة أخرى
  active --> inactive : انقطاع / إيقاف مؤقت

  promoted --> active : بداية العام الجديد

  graduated --> [*]
  transferred --> [*]
  rejected --> [*]
  inactive --> active : استئناف الدراسة
  inactive --> [*]
```

---

## 4. مخطط حالات جلسة الخزينة — Treasury Session State Diagram

```mermaid
stateDiagram-v2
  [*] --> open : الكاشير يفتح الخزينة بالرصيد الافتتاحي

  open --> open : تسجيل مدفوعات / مصروفات / إيداعات بنكية
  note right of open
    كل دفعة وكل مصروف يُسجَّل
    تحت هذه الجلسة المفتوحة
  end note

  open --> pending_close : الكاشير يطلب إغلاق الخزينة
  note right of pending_close
    يُدخل الكاشير الرصيد الفعلي المعدود
    إذا تطابق → ينتظر موافقة المدير
    إذا يوجد فرق → تُكتب ملاحظة
  end note

  pending_close --> closed : المدير يوافق على الإغلاق
  pending_close --> open : المدير يرفض — يعيد الجلسة للمراجعة

  closed --> reopen_requested : الكاشير يطلب إعادة الفتح (خطأ أو تعديل)
  reopen_requested --> open : المدير يوافق على إعادة الفتح
  reopen_requested --> closed : المدير يرفض إعادة الفتح

  closed --> [*]
```

---

## 5. مخطط حالات المصروف — Expense Status State Diagram

```mermaid
stateDiagram-v2
  [*] --> pending_treasury : الموظف يسجل مصروفاً جديداً

  pending_treasury --> approved : المحاسب / المدير يوافق
  pending_treasury --> rejected : المحاسب / المدير يرفض
  note right of pending_treasury
    يتوقف على صلاحية المستخدم (ExpenseLimit)
    ودور المستخدم وحد الصلاحية
  end note

  approved --> paid : الكاشير يدفع من الخزينة المفتوحة
  note right of approved
    لا يمكن الدفع إلا عندما
    تكون الخزينة مفتوحة (open)
  end note

  paid --> [*]
  rejected --> [*]
```

---

## 6. مخطط حالات الخصم — Discount Approval State Diagram

```mermaid
stateDiagram-v2
  [*] --> none : الطالب بلا خصم

  none --> requested : الموظف يطلب خصماً للطالب
  note right of requested
    يُقيَّد بحد الخصم المسموح للموظف
    (discountLimitPercent في User)
    وحد دور المستخدم (RoleLimit)
  end note

  requested --> approved : مدير مخوّل يوافق
  requested --> rejected : مدير مخوّل يرفض

  approved --> active : يُطبَّق الخصم على إجمالي رسوم الطالب
  rejected --> none : يبقى الطالب بلا خصم

  none --> auto_badge : ربط شارة Badge بالطالب يُطبق الخصم تلقائياً
  auto_badge --> active
```

---

## 7. مخطط تسلسل رحلة القبول — Admission Sequence Diagram

```mermaid
sequenceDiagram
  actor موظف_قبول as موظف القبول
  participant UI as واجهة المستخدم
  participant API as Express API
  participant DB as PostgreSQL

  موظف_قبول->>UI: يفتح /admission/new
  UI->>موظف_قبول: نموذج بيانات الطالب

  موظف_قبول->>UI: يملأ البيانات ويضغط حفظ
  UI->>API: POST /api/students (status: applied)
  API->>DB: INSERT Student
  DB-->>API: student record
  API-->>UI: 201 Created
  UI-->>موظف_قبول: ✅ تم تسجيل الطلب

  Note over موظف_قبول,DB: بعد الاختبار والقبول

  موظف_قبول->>UI: يفتح بيانات الطالب
  UI->>API: GET /api/stage-fees?stage=&grade=&track=&year=
  API->>DB: SELECT StageFee
  DB-->>API: رسوم المرحلة
  API-->>UI: الرسوم
  UI-->>موظف_قبول: يعرض الرسوم المحسوبة

  موظف_قبول->>UI: يؤكد الرسوم ويحدث الحالة → fee_setup
  UI->>API: PATCH /api/students/:id
  API->>DB: UPDATE Student (fees + status)
  DB-->>API: ✅
  API-->>UI: ✅

  موظف_قبول->>UI: يرسل للموافقة → pending_approval
  UI->>API: PATCH /api/students/:id (status: pending_approval)
  API->>DB: UPDATE Student
  DB-->>API: ✅
  API-->>UI: ✅

  Note over موظف_قبول,DB: المدير يوافق

  actor مدير as المدير
  مدير->>UI: يرى قائمة pending_approval
  مدير->>UI: يوافق → admitted
  UI->>API: PATCH /api/students/:id (status: admitted)
  API->>DB: UPDATE Student
  DB-->>API: ✅
  API-->>UI: ✅
  UI-->>مدير: ✅ تم القبول الرسمي
```

---

## 8. مخطط تسلسل تسجيل دفعة — Payment Sequence Diagram

```mermaid
sequenceDiagram
  actor كاشير as الكاشير
  participant UI as واجهة المستخدم
  participant API as Express API
  participant DB as PostgreSQL

  Note over كاشير,DB: شرط أساسي: الخزينة مفتوحة

  كاشير->>UI: يبحث عن الطالب في /payments
  UI->>API: GET /api/students?search=...
  API->>DB: SELECT Student
  DB-->>API: نتائج البحث
  API-->>UI: قائمة الطلاب
  UI-->>كاشير: يعرض الطلاب

  كاشير->>UI: يختار الطالب، يدخل المبلغ، نوع الدفع، طريقة الدفع
  UI->>UI: يحسب الرصيد المتبقي محلياً

  alt دفعة مباشرة (بدون موافقة)
    كاشير->>UI: يضغط "تسجيل الدفعة"
    UI->>API: POST /api/payments
    API->>DB: INSERT Payment + UPDATE Student.paidAmount
    DB-->>API: receiptNumber
    API-->>UI: ✅ + رقم الإيصال
    UI-->>كاشير: نافذة طباعة الإيصال
  else دفعة تحتاج موافقة (مبلغ كبير أو خصم)
    كاشير->>UI: يضغط "طلب موافقة"
    UI->>API: PATCH /api/students/:id (pendingPayment...)
    API->>DB: UPDATE Student (paymentRequestStatus: pending)
    DB-->>API: ✅
    API-->>UI: ✅
    UI-->>كاشير: في انتظار الموافقة

    actor مدير as المدير
    مدير->>UI: يفتح /payment-approvals
    مدير->>UI: يوافق على الطلب
    UI->>API: POST /api/payments (approved)
    API->>DB: INSERT Payment + CLEAR pendingPayment
    DB-->>API: ✅
    API-->>UI: ✅
    UI-->>مدير: ✅ تمت الموافقة والتسجيل
  end
```

---

## 9. مخطط تسلسل عملية الشراء — Procurement Sequence Diagram

```mermaid
sequenceDiagram
  actor موظف_مستودع as موظف المستودع
  actor مدير as المدير / المحاسب
  participant UI as واجهة المستخدم
  participant API as Express API
  participant DB as PostgreSQL

  موظف_مستودع->>UI: يفتح /purchasing → "طلب شراء جديد"
  موظف_مستودع->>UI: يختار مورد، يضيف مواد + كميات + تكلفة تقديرية
  UI->>API: POST /api/purchasing/requests
  API->>DB: INSERT PurchaseRequest (status: pending_approval)
  DB-->>API: ✅
  API-->>UI: ✅ طلب الشراء مسجل

  مدير->>UI: يرى الطلبات المعلقة
  مدير->>UI: يوافق على الطلب
  UI->>API: PATCH /api/purchasing/requests/:id (status: approved)
  API->>DB: UPDATE PurchaseRequest
  DB-->>API: ✅

  موظف_مستودع->>UI: ينشئ أمر شراء من الطلب المعتمد
  UI->>API: POST /api/purchasing/orders
  API->>DB: INSERT PurchaseOrder (status: issued)
  DB-->>API: ✅

  Note over موظف_مستودع,DB: استلام البضاعة

  موظف_مستودع->>UI: يسجل استلام البضاعة
  UI->>API: POST /api/purchasing/receipts
  API->>DB: INSERT GoodsReceipt + UPDATE InventoryItem.quantity
  DB-->>API: ✅
  API-->>UI: ✅ تم التحديث في المستودع

  Note over موظف_مستودع,DB: دفع الفاتورة

  مدير->>UI: يسجل فاتورة المورد
  UI->>API: POST /api/purchasing/invoices
  API->>DB: INSERT PurchaseInvoice
  DB-->>API: ✅

  مدير->>UI: يدفع الفاتورة من الخزينة المفتوحة
  UI->>API: POST /api/purchasing/supplier-payments
  API->>DB: INSERT SupplierPayment + UPDATE Invoice.paidAmount
  DB-->>API: ✅
  API-->>UI: ✅ تم الدفع
```

---

## 10. مخطط تسلسل توزيع المواد على الطلاب — Distribution Sequence Diagram

```mermaid
sequenceDiagram
  actor موظف_مستودع as موظف المستودع
  participant UI as واجهة المستخدم
  participant API as Express API
  participant DB as PostgreSQL

  Note over موظف_مستودع,DB: أولاً: إنشاء قائمة مواد الصف

  موظف_مستودع->>UI: /grade-item-lists → قائمة جديدة
  موظف_مستودع->>UI: يختار المرحلة/الصف/المسار/الفصل
  موظف_مستودع->>UI: يضيف المواد + الكميات + السعر البيعي
  UI->>API: POST /api/grade-item-lists
  API->>DB: INSERT GradeItemList + GradeItemListEntry[]
  DB-->>API: ✅

  Note over موظف_مستودع,DB: ثانياً: إنشاء أمر تسليم لطالب

  موظف_مستودع->>UI: /delivery-orders → أمر جديد
  موظف_مستودع->>UI: يختار طالباً → يُحمَّل قائمة الصف تلقائياً
  موظف_مستودع->>UI: يختار نوع الشحن (ضمن الرسوم / تكلفة إضافية)
  UI->>API: POST /api/delivery-orders
  API->>DB: INSERT DeliveryOrder (status: pending)
  DB-->>API: ✅

  Note over موظف_مستودع,DB: ثالثاً: تأكيد التسليم

  موظف_مستودع->>UI: يضغط "تأكيد التسليم"
  UI->>API: PATCH /api/delivery-orders/:id (status: delivered)
  API->>DB: UPDATE DeliveryOrder + INSERT InventoryTransaction (deduct)
  DB-->>API: ✅
  API-->>UI: ✅ تم الخصم من المستودع وتسجيل التسليم
```

---

## 11. مخطط مكونات النظام — System Component Diagram

```mermaid
graph TB
  subgraph BROWSER["🖥️ المتصفح / Browser"]
    REACT["React 18 + Vite\n(SPA — Arabic RTL)"]
    ZUSTAND["Zustand Stores\n(Client State)"]
    SHADCN["Shadcn UI + Tailwind\n(Design System)"]
    REACT -->|يستخدم| ZUSTAND
    REACT -->|يرسم| SHADCN
  end

  subgraph SERVER["⚙️ الخادم / Express Server :4000"]
    EXPRESS["Express 5\n(REST API)"]
    AUTH_MW["Auth Middleware\n(JWT Verification)"]
    AUDIT_MW["Audit Middleware\n(Auto Logging)"]
    ROUTES["API Routes\n/students /payments /treasury\n/expenses /accounting /bus\n/inventory /purchasing"]
    EXPRESS --> AUTH_MW
    AUTH_MW --> ROUTES
    ROUTES --> AUDIT_MW
  end

  subgraph DB_LAYER["🗄️ طبقة البيانات"]
    PRISMA["Prisma ORM"]
    POSTGRES["PostgreSQL 16"]
    PRISMA --> POSTGRES
  end

  subgraph CROSS_CUTTING["🔧 خدمات مشتركة"]
    CRYPTO["Crypto Lib\n(Hash nationalId)"]
    DECIMAL["Decimal Lib\n(دقة مالية)"]
    PRINT["Print Hooks\n(Receipts, Reports)"]
  end

  REACT -->|HTTP Fetch + JWT| EXPRESS
  ROUTES -->|Prisma Client| PRISMA
  ROUTES --> CRYPTO
  ROUTES --> DECIMAL
  REACT --> PRINT
```

---

## 12. ملخص وحدات النظام — Module Summary

| الوحدة | الغرض | الحالة |
|--------|--------|--------|
| 🔐 المصادقة | JWT + دور المستخدم + صلاحيات دقيقة | ✅ مكتملة |
| 👨‍🎓 الطلاب | إدارة دورة حياة الطالب الكاملة | ✅ مكتملة |
| 📋 القبول | رحلة القبول من التقديم للقبول الرسمي | ✅ مكتملة |
| 💰 الرسوم | رسوم المراحل الدراسية متعددة المسارات | ✅ مكتملة |
| 💳 المدفوعات | تسجيل، موافقة، إيصالات، تقسيط | ✅ مكتملة |
| 🏷️ الخصومات | طلب، موافقة، شارات خصم تلقائية | ✅ مكتملة |
| 🏦 الخزينة | جلسات يومية، إغلاق، إيداع بنكي | ✅ مكتملة |
| 📊 المصروفات | طلب، موافقة، دفع من الخزينة | ⚠️ قيد التطوير |
| 📚 المحاسبة | دليل حسابات، قيود يومية، تقارير | ⚠️ قيد التطوير |
| 🚌 الحافلات | مسارات، اشتراكات، عقود إيجار | ✅ مكتملة |
| 📦 المستودع | مواد، شراء، موردون، استلام | ✅ مكتملة |
| 📬 التوزيع | قوائم الصفوف، أوامر تسليم الطلاب | ✅ مكتملة |
| 👥 المستخدمون | إدارة المستخدمين والصلاحيات | ✅ مكتملة |
| 📈 التقارير | تقارير مالية وإدارية | ⚠️ جزئية |
| 🛠️ الإدارة | قاعدة البيانات، هجرة، سجلات | ✅ مكتملة |

---

## 13. نقاط ضعف تظهر من رحلة المستخدم

> هذه ملاحظات من منظور المستخدم النهائي — ليست أخطاء في الكود بل فجوات في التجربة.

1. **الخزينة والمصروفات مترابطتان بقوة** — لا يمكن دفع مصروف بدون خزينة مفتوحة. لكن قد يحتاج المستخدم أن يرى المصروفات المعلقة حتى عند إغلاق الخزينة.

2. **تقارير الطلاب جزئية** — المستخدم يريد: "كم طالباً لم يسدد؟ ما إجمالي المتأخرات؟" — هذه التقارير غير واضحة المعالم.

3. **دليل الحسابات والقيود اليومية** — معظمها يدوي حتى الآن. المستخدم يتوقع أن تُنشأ قيود تلقائياً من كل عملية مالية (دفعة → قيد، مصروف → قيد).

4. **الشارة والخصم** — ربط الشارة يُطبق الخصم لكن لا تُحسب من الرسوم الحالية مباشرةً في بعض الحالات (انظر خطة `2026-05-26-badge-discount-not-deducted.md`).

5. **ترقية الطلاب** — عملية جماعية لكن تحتاج مراجعة لكل طالب على حدة قبل التأكيد.

---

*تاريخ الإنشاء: 2026-05-26 | بناءً على: تحليل الكود + تجربة المستخدم النهائي*
