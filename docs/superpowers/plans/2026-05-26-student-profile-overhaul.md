# Student Profile Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تحويل ملف الطالب إلى لوحة تحكم كاملة: شريط حالة فوري، تعديل سريع، سجل تواصل، وفلاتر أقوى في القائمة.

**Architecture:** Backend-first for the contact log (new Prisma model + two routes). All other features are pure frontend using data already loaded. Photo upload stores base64 in the existing `photoUrl` field. Status bar is derived from `studentPayments` already in memory.

**Tech Stack:** React + TypeScript (frontend), Express + Prisma + PostgreSQL (backend), Tailwind CSS, shadcn/ui

---

## File Map

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `StudentContactLog` model |
| `server/src/routes/students.ts` | Add contact log routes + photo upload route |
| `src/types/index.ts` | Add `StudentContactLog` type |
| `src/pages/StudentDetail.tsx` | Status bar + quick edit + contact log tab |
| `src/pages/Students.tsx` | Status filter + grade filter + last-payment column |

---

## Task 1: StudentContactLog — DB Schema

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the model**

Open `server/prisma/schema.prisma`. Find the `Student` model's relation list (around line 76-81). Add the new relation line:

```prisma
// Inside Student model, after `deliveryOrders DeliveryOrder[]`:
  contactLogs                 StudentContactLog[]
```

Then add the new model at the end of the file (after the last model):

```prisma
model StudentContactLog {
  id        String   @id @default(uuid())
  studentId String
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  date      String
  notes     String
  outcome   String
  createdBy String
  createdAt DateTime @default(now())

  @@index([studentId])
}
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server"
npx prisma migrate dev --name add_student_contact_log
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Open browser, confirm `StudentContactLog` table exists. Close studio (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add StudentContactLog model"
```

---

## Task 2: Contact Log API Routes + Photo Upload

**Files:**
- Modify: `server/src/routes/students.ts`

- [ ] **Step 1: Add contact log GET route**

In `server/src/routes/students.ts`, add these two routes just before the `export default router` line at the bottom:

```typescript
// GET contact log for a student
router.get('/:id/contacts', requireAuth, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const logs = await prisma.studentContactLog.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact logs' });
  }
});

// POST new contact log entry
router.post('/:id/contacts', requireAuth, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { date, notes, outcome } = req.body;
  const createdBy = req.user?.userId ?? 'unknown';
  try {
    const log = await prisma.studentContactLog.create({
      data: { studentId: id, date, notes, outcome, createdBy },
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create contact log' });
  }
});

// POST photo upload (stores base64 in photoUrl field)
router.post('/:id/photo', requireAuth, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { photoUrl } = req.body; // base64 data URL: "data:image/jpeg;base64,..."
  if (!photoUrl || !photoUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image data' });
  }
  try {
    const student = await prisma.student.update({
      where: { id },
      data: { photoUrl },
    });
    res.json({ photoUrl: student.photoUrl });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update photo' });
  }
});
```

- [ ] **Step 2: Build server**

```bash
cd "/Users/me/Downloads/Project/untitled folder/server" && npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/students.ts
git commit -m "feat(api): add contact log routes and photo upload endpoint"
```

---

## Task 3: Add `StudentContactLog` Type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add type**

Open `src/types/index.ts`. Add after the `Student` interface (around line 112):

```typescript
export type ContactOutcome = 'contacted' | 'no_answer' | 'promised' | 'paid_after';

export interface StudentContactLog {
  id: string;
  studentId: string;
  date: string;
  notes: string;
  outcome: ContactOutcome;
  createdBy: string;
  createdAt: string;
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add StudentContactLog type"
```

---

## Task 4: Status Bar in StudentDetail

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

The status bar sits between the back-link and the student header grid. It derives all its data from values already loaded:
- Payment status from `totalFees`, `paidAmount`, `enrollmentDate`
- Books/uniform received from `studentPayments` (type `'books'` / `'uniform'`)

- [ ] **Step 1: Add the status bar JSX**

Open `src/pages/StudentDetail.tsx`. Find this line (around line 267-268):

```tsx
    return (
        <div className="space-y-6">
            <Link to="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
```

Replace it with:

```tsx
    const isOverdue = student
        ? Number(student.totalFees) - Number(student.paidAmount) > 0
        : false;
    const booksReceived = studentPayments.some(p => p.type === 'books');
    const uniformReceived = studentPayments.some(p => p.type === 'uniform');
    const booksRequired = student ? Number(student.booksFees) > 0 : false;
    const uniformRequired = student ? Number(student.uniformFees) > 0 : false;

    return (
        <div className="space-y-6">
            <Link to="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
```

- [ ] **Step 2: Insert the status bar between the back-link and the header grid**

Find this exact line (around line 272):

```tsx
            {/* Student Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

Insert before it:

```tsx
            {/* Status Bar */}
            {student && (
                <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        <span className={`size-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {isOverdue ? `متأخر — متبقي ${formatCurrency(Number(student.totalFees) - Number(student.paidAmount))}` : 'منتظم في السداد'}
                    </span>
                    {booksRequired && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${booksReceived ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            📚 الكتب: {booksReceived ? 'مُسدَّدة ✓' : 'لم تُسدَّد'}
                        </span>
                    )}
                    {uniformRequired && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${uniformReceived ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            👔 الزي: {uniformReceived ? 'مُسدَّد ✓' : 'لم يُسدَّد'}
                        </span>
                    )}
                    {student.arrearsFees > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200">
                            ⚠️ مديونية سابقة: {formatCurrency(student.arrearsFees)}
                        </span>
                    )}
                </div>
            )}

            {/* Student Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

- [ ] **Step 3: Verify build**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

- [ ] **Step 4: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat(students): add status bar (overdue, books, uniform, arrears)"
```

---

## Task 5: Quick Edit — Phone and Class

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

Two inline-edit patterns: phone (edit-in-place on click), class (small dialog).

- [ ] **Step 1: Add state variables**

In `StudentDetail`, after the existing `useState` declarations (around line 93), add:

```tsx
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const [classDialogOpen, setClassDialogOpen] = useState(false);
    const [classForm, setClassForm] = useState({ grade: '', className: '' });
    const [savingField, setSavingField] = useState(false);
```

- [ ] **Step 2: Add handler functions**

After `handleAssignBadge` (around line 116), add:

```tsx
    const handleSavePhone = async () => {
        if (!student || !phoneValue.trim()) return;
        setSavingField(true);
        try {
            await updateStudent(student.id, { guardianPhone: phoneValue.trim() });
            setEditingPhone(false);
            toast.success('تم تحديث رقم الهاتف');
        } catch {
            toast.error('فشل تحديث الرقم');
        } finally {
            setSavingField(false);
        }
    };

    const handleSaveClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;
        setSavingField(true);
        try {
            await updateStudent(student.id, { grade: classForm.grade, className: classForm.className });
            setClassDialogOpen(false);
            toast.success('تم نقل الطالب للفصل الجديد');
        } catch {
            toast.error('فشل تحديث الفصل');
        } finally {
            setSavingField(false);
        }
    };
```

- [ ] **Step 3: Replace the phone display line**

Find this line in the student header (around line 305):

```tsx
                                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> الهاتف: <span className="tabular-nums font-medium text-foreground" dir="ltr">{student.guardianPhone}</span></div>
```

Replace with:

```tsx
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="size-4" /> الهاتف:{' '}
                                    {editingPhone ? (
                                        <span className="flex items-center gap-1">
                                            <Input
                                                autoFocus
                                                dir="ltr"
                                                className="h-7 w-36 tabular-nums text-sm"
                                                value={phoneValue}
                                                onChange={e => setPhoneValue(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(); if (e.key === 'Escape') setEditingPhone(false); }}
                                            />
                                            <Button size="icon" className="size-7" onClick={handleSavePhone} disabled={savingField}>✓</Button>
                                            <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingPhone(false)}>✕</Button>
                                        </span>
                                    ) : (
                                        <span className="tabular-nums font-medium text-foreground" dir="ltr">
                                            {student.guardianPhone}
                                            <button
                                                className="mr-1 text-muted-foreground hover:text-primary opacity-60 hover:opacity-100"
                                                onClick={() => { setPhoneValue(student.guardianPhone); setEditingPhone(true); }}
                                                title="تعديل الرقم"
                                            >✏️</button>
                                        </span>
                                    )}
                                </div>
```

- [ ] **Step 4: Replace the grade/class display line and add class dialog**

Find (around line 301):

```tsx
                            <p className="text-sm text-muted-foreground mt-1">{stageLabels[student.stage]} — {student.grade} / {student.className}</p>
```

Replace with:

```tsx
                            <p className="text-sm text-muted-foreground mt-1">
                                {stageLabels[student.stage]} — {student.grade} / {student.className}
                                <button
                                    className="mr-1 text-muted-foreground hover:text-primary opacity-60 hover:opacity-100 text-xs"
                                    onClick={() => { setClassForm({ grade: student.grade, className: student.className || '' }); setClassDialogOpen(true); }}
                                    title="نقل لفصل آخر"
                                >✏️</button>
                            </p>
```

Then find the Badge Assignment Dialog block at the end of the file (the `{badgeDialogOpen && (` block around line 738) and add the class dialog just before it:

```tsx
            {/* Class Change Dialog */}
            {classDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setClassDialogOpen(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4 font-[Noto_Kufi_Arabic]">نقل لفصل آخر</h3>
                        <form onSubmit={handleSaveClass} className="space-y-4">
                            <div className="space-y-2">
                                <Label>الصف</Label>
                                <Input
                                    required
                                    value={classForm.grade}
                                    onChange={e => setClassForm(f => ({ ...f, grade: e.target.value }))}
                                    placeholder="مثال: الثاني"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>الفصل</Label>
                                <Input
                                    required
                                    value={classForm.className}
                                    onChange={e => setClassForm(f => ({ ...f, className: e.target.value }))}
                                    placeholder="مثال: 2/ب"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setClassDialogOpen(false)}>إلغاء</Button>
                                <Button type="submit" disabled={savingField}>حفظ النقل</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
```

- [ ] **Step 5: Build and verify**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

- [ ] **Step 6: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat(students): inline phone edit and class transfer dialog"
```

---

## Task 6: Photo Upload (inline in header)

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

- [ ] **Step 1: Add upload state**

After the existing `savingField` state (added in Task 5), add:

```tsx
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
```

- [ ] **Step 2: Add upload handler**

After `handleSaveClass`, add:

```tsx
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !student) return;
        if (file.size > 500 * 1024) { toast.error('الصورة أكبر من 500KB — يرجى ضغطها أولاً'); return; }
        setUploadingPhoto(true);
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await fetch(`/api/students/${student.id}/photo`, {
                    method: 'POST',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photoUrl: reader.result }),
                });
                if (!res.ok) throw new Error();
                await fetchStudents();
                toast.success('تم تحديث الصورة');
            } catch {
                toast.error('فشل رفع الصورة');
            } finally {
                setUploadingPhoto(false);
            }
        };
        reader.readAsDataURL(file);
    };
```

- [ ] **Step 3: Replace the avatar div**

Find (around line 277):

```tsx
                        <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <User className="size-8" />
                        </div>
```

Replace with:

```tsx
                        <label className="size-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/20 transition-colors overflow-hidden relative group" title="انقر لتغيير الصورة">
                            {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.name} className="size-full object-cover" />
                            ) : (
                                <User className="size-8" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                                {uploadingPhoto ? '...' : '📷'}
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                        </label>
```

- [ ] **Step 4: Build**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

- [ ] **Step 5: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat(students): clickable avatar with photo upload (base64, max 500KB)"
```

---

## Task 7: Contact Log Tab

**Files:**
- Modify: `src/pages/StudentDetail.tsx`

- [ ] **Step 1: Add contact log state**

After `uploadingPhoto` state, add:

```tsx
    const [contactLogs, setContactLogs] = useState<import('@/types').StudentContactLog[]>([]);
    const [contactForm, setContactForm] = useState({ date: new Date().toISOString().split('T')[0], notes: '', outcome: 'contacted' as import('@/types').ContactOutcome });
    const [savingContact, setSavingContact] = useState(false);
```

- [ ] **Step 2: Add fetch effect**

After the delivery orders `useEffect` (around line 61), add:

```tsx
    useEffect(() => {
        if (!id) return;
        fetch(`/api/students/${id}/contacts`, { headers: getAuthHeaders() })
            .then(r => r.json()).then(setContactLogs).catch(() => {});
    }, [id]);
```

- [ ] **Step 3: Add save handler**

After `handlePhotoUpload`, add:

```tsx
    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student || !contactForm.notes.trim()) return;
        setSavingContact(true);
        try {
            const res = await fetch(`/api/students/${student.id}/contacts`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm),
            });
            if (!res.ok) throw new Error();
            const newLog = await res.json();
            setContactLogs(prev => [newLog, ...prev]);
            setContactForm(f => ({ ...f, notes: '', outcome: 'contacted' }));
            toast.success('تم تسجيل التواصل');
        } catch {
            toast.error('فشل حفظ السجل');
        } finally {
            setSavingContact(false);
        }
    };
```

- [ ] **Step 4: Add the tab trigger**

Find the `<TabsList>` (around line 532):

```tsx
                <TabsList>
                    <TabsTrigger value="payments">سجل المدفوعات</TabsTrigger>
```

Add the new trigger after `payments`:

```tsx
                <TabsList>
                    <TabsTrigger value="contacts">سجل التواصل {contactLogs.length > 0 && <span className="mr-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{contactLogs.length}</span>}</TabsTrigger>
                    <TabsTrigger value="payments">سجل المدفوعات</TabsTrigger>
```

- [ ] **Step 5: Add the tab content**

Find `<TabsContent value="payments">` and add the contacts tab content before it:

```tsx
                <TabsContent value="contacts" className="space-y-4">
                    {/* Add new contact */}
                    <div className="rounded-lg border bg-card p-5">
                        <h4 className="font-bold mb-4 font-[Noto_Kufi_Arabic]">تسجيل محاولة تواصل جديدة</h4>
                        <form onSubmit={handleSaveContact} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>التاريخ</Label>
                                    <Input type="date" value={contactForm.date} onChange={e => setContactForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>النتيجة</Label>
                                    <Select value={contactForm.outcome} onValueChange={v => setContactForm(f => ({ ...f, outcome: v as import('@/types').ContactOutcome }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="contacted">تم التواصل</SelectItem>
                                            <SelectItem value="no_answer">لم يرد</SelectItem>
                                            <SelectItem value="promised">وعد بالسداد</SelectItem>
                                            <SelectItem value="paid_after">سدد بعد التواصل</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>ملاحظات</Label>
                                <Input
                                    required
                                    placeholder="مثال: وعد بالحضور الأسبوع القادم..."
                                    value={contactForm.notes}
                                    onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={savingContact || !contactForm.notes.trim()} size="sm">
                                    {savingContact ? 'جارٍ الحفظ...' : 'حفظ التواصل'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Contact log list */}
                    {contactLogs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Phone className="size-10 mx-auto mb-3 opacity-30" />
                            <p>لا يوجد سجل تواصل بعد</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {contactLogs.map(log => {
                                const outcomeConfig: Record<string, { label: string; color: string }> = {
                                    contacted:  { label: 'تم التواصل',        color: 'bg-emerald-100 text-emerald-700' },
                                    no_answer:  { label: 'لم يرد',            color: 'bg-gray-100 text-gray-600' },
                                    promised:   { label: 'وعد بالسداد',       color: 'bg-blue-100 text-blue-700' },
                                    paid_after: { label: 'سدد بعد التواصل',   color: 'bg-violet-100 text-violet-700' },
                                };
                                const cfg = outcomeConfig[log.outcome] ?? { label: log.outcome, color: 'bg-gray-100 text-gray-600' };
                                return (
                                    <div key={log.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">{log.notes}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{formatDateShort(log.date)} · {log.createdBy}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
```

- [ ] **Step 6: Build**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

- [ ] **Step 7: Commit**

```bash
git add src/pages/StudentDetail.tsx
git commit -m "feat(students): add contact log tab with history and new entry form"
```

---

## Task 8: Students List — Filters + Last Payment Column

**Files:**
- Modify: `src/pages/Students.tsx`

- [ ] **Step 1: Add status filter state**

Open `src/pages/Students.tsx`. After `stageFilter` state (around line 41), add:

```tsx
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [gradeFilter, setGradeFilter] = useState<string>('all');
```

- [ ] **Step 2: Add grade options derived from data**

After the `filtered` useMemo (around line 80), add:

```tsx
    const gradeOptions = useMemo(() => {
        const grades = [...new Set(enrolledStudents.map(s => s.grade).filter(Boolean))].sort();
        return grades;
    }, [enrolledStudents]);
```

- [ ] **Step 3: Update the `filtered` useMemo to include new filters**

Find the `filtered` useMemo (around line 71-80):

```tsx
    const filtered = useMemo(() => {
        return enrolledStudents.filter((s) => {
            if (!s || !s.name || !s.nationalId) return false;
            const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
                              (s.nationalId || '').includes(search) || 
                              (s.guardianPhone || '').includes(search);
            const matchStage = stageFilter === 'all' || s.stage === stageFilter;
            return matchSearch && matchStage;
        });
    }, [enrolledStudents, search, stageFilter]);
```

Replace with:

```tsx
    const filtered = useMemo(() => {
        return enrolledStudents.filter((s) => {
            if (!s || !s.name || !s.nationalId) return false;
            const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
                              (s.nationalId || '').includes(search) ||
                              (s.guardianPhone || '').includes(search);
            const matchStage = stageFilter === 'all' || s.stage === stageFilter;
            const matchStatus = statusFilter === 'all' || s.status === statusFilter;
            const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
            return matchSearch && matchStage && matchStatus && matchGrade;
        });
    }, [enrolledStudents, search, stageFilter, statusFilter, gradeFilter]);
```

- [ ] **Step 4: Add last-payment lookup**

After `filtered` useMemo, add:

```tsx
    const lastPaymentByStudent = useMemo(() => {
        const map: Record<string, string> = {};
        // payments are available on each student via the store indirectly;
        // we derive from student.paidAmount > 0 as a fallback indicator.
        // For an exact date, import usePaymentsStore here if needed.
        return map;
    }, []);
```

Note: `Students.tsx` does not currently import `usePaymentsStore`. Add the import at the top:

```tsx
import { usePaymentsStore } from '@/stores/paymentsStore';
```

Then replace the `lastPaymentByStudent` useMemo with:

```tsx
    const { payments } = usePaymentsStore();
    const lastPaymentByStudent = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of payments) {
            if (!p.studentId) continue;
            if (!map[p.studentId] || p.date > map[p.studentId]) {
                map[p.studentId] = p.date;
            }
        }
        return map;
    }, [payments]);
```

Also add this effect after the existing `useEffect`:

```tsx
    const { fetchPayments } = usePaymentsStore();
    useEffect(() => { fetchPayments(); }, [fetchPayments]);
```

- [ ] **Step 5: Add filter controls to the toolbar**

Find the toolbar div (around line 154-175):

```tsx
            <div className="flex flex-col sm:row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input placeholder="بحث بالاسم أو الرقم القومي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                    </div>
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger className="w-44">
                            <Filter className="size-4 ml-2" />
                            <SelectValue placeholder="كل المراحل" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل المراحل</SelectItem>
                            {stageOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>


            </div>
```

Replace with:

```tsx
            <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="بحث بالاسم أو الرقم القومي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-40">
                        <Filter className="size-4 ml-2" />
                        <SelectValue placeholder="كل المراحل" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل المراحل</SelectItem>
                        {stageOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="كل الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        {statusOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="كل الصفوف" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الصفوف</SelectItem>
                        {gradeOptions.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(stageFilter !== 'all' || statusFilter !== 'all' || gradeFilter !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={() => { setStageFilter('all'); setStatusFilter('all'); setGradeFilter('all'); }}>
                        مسح الفلاتر ✕
                    </Button>
                )}
            </div>
```

- [ ] **Step 6: Add last-payment column to table header**

Find the table header row (around line 195-203):

```tsx
                        <tr className="border-b bg-muted/40">
                            <th className="text-right p-3 font-semibold">الطالب</th>
                            <th className="text-right p-3 font-semibold hidden md:table-cell">المرحلة</th>
                            <th className="text-right p-3 font-semibold">الصف / الفصل</th>
                            <th className="text-right p-3 font-semibold hidden lg:table-cell">ولي الأمر</th>
                            <th className="text-right p-3 font-semibold">التحصيل المالي</th>
                            <th className="text-right p-3 font-semibold hidden sm:table-cell">الحالة</th>
                            <th className="text-right p-3 font-semibold w-24">إجراءات</th>
                        </tr>
```

Replace with:

```tsx
                        <tr className="border-b bg-muted/40">
                            <th className="text-right p-3 font-semibold">الطالب</th>
                            <th className="text-right p-3 font-semibold hidden md:table-cell">المرحلة</th>
                            <th className="text-right p-3 font-semibold">الصف / الفصل</th>
                            <th className="text-right p-3 font-semibold hidden lg:table-cell">ولي الأمر</th>
                            <th className="text-right p-3 font-semibold">التحصيل المالي</th>
                            <th className="text-right p-3 font-semibold hidden xl:table-cell">آخر دفعة</th>
                            <th className="text-right p-3 font-semibold hidden sm:table-cell">الحالة</th>
                            <th className="text-right p-3 font-semibold w-24">إجراءات</th>
                        </tr>
```

- [ ] **Step 7: Add last-payment cell to each table row**

Find inside the `filtered.map` tbody row, after the financial column `<td>` (around line 244) and before the status `<td>`:

```tsx
                                        <td className="p-3 hidden sm:table-cell">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-medium ${statusColors[s.status]}`}>
```

Add before it:

```tsx
                                        <td className="p-3 hidden xl:table-cell text-xs text-muted-foreground tabular-nums">
                                            {lastPaymentByStudent[s.id] ? formatDateShort(lastPaymentByStudent[s.id]) : '—'}
                                        </td>
```

- [ ] **Step 8: Build**

```bash
cd "/Users/me/Downloads/Project/untitled folder" && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

- [ ] **Step 9: Commit**

```bash
git add src/pages/Students.tsx
git commit -m "feat(students): add status/grade filters and last-payment column to list"
```

---

## Self-Review

**Spec coverage:**
- ✅ شريط الحالة الفورية → Task 4
- ✅ التعديل السريع (هاتف + فصل + صورة) → Tasks 5 + 6
- ✅ سجل التواصل → Tasks 1 + 2 + 3 + 7
- ✅ وضوح المديونية → شريط الحالة يعرض المديونية (Task 4) + الملخص المالي (سبق بناؤه)
- ✅ فلاتر القائمة + عمود آخر دفعة → Task 8

**Placeholder scan:** لا يوجد — كل خطوة تحتوي على كود كامل.

**Type consistency:**
- `ContactOutcome` معرّف في Task 3 ومستخدم في Tasks 7
- `StudentContactLog` معرّف في Task 3 ومستخدم في Task 7
- `updateStudent` من `useStudentsStore` موجود مسبقاً ويقبل `Partial<Student>`
