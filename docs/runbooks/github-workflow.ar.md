<div dir="rtl">

# دليل التعامل مع GitHub

دليل خطوة بخطوة للعمل مع الفروع، الـ Pull Requests، فحوصات CI، والتراجع.
استخدم نفس الأوامر في كل مرة لإبقاء `main` نظيفًا وقابلًا للنشر.

> **القواعد الذهبية**
> 1. لا تعمل commit مباشرة على `main` — أنشئ فرعًا دائمًا.
> 2. تحقّق محليًا قبل الدفع — يوفّر دورات انتظار CI.
> 3. عند ترقيات التبعيات الكبرى (React/Prisma) تابع سلسلة peer dependencies والتغييرات الكاسرة — رفع الرقم وحده لا يكفي.
> 4. بعد دمج أي PR، قد تتعارض الفروع الأخرى المفتوحة — حدّثها بـ `git merge origin/main` وأعد التحقق.
> 5. على فرع مشترك استخدم `git revert` (آمن)، ولا تستخدم `git reset` (يعيد كتابة التاريخ).

---

## ١. حدّث `main` قبل البدء

```bash
git checkout main
git pull origin main
```

## ٢. أنشئ فرعًا للميزة

```bash
git checkout -b feat/اسم-الميزة      # مثال: feat/student-registration
```

تسمية الفروع:
- `feat/...` ميزة جديدة
- `fix/...` إصلاح خطأ
- `chore/...` صيانة (مثل ترقية التبعيات)

## ٣. اشتغل واحفظ تقدّمك (commits)

```bash
git status
git add .                              # أو: git add ملف-معيّن
git commit -m "feat(students): add registration form"
```

اتبع صيغة **Conventional Commits**: `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `docs(...)`.

## ٤. تحقّق محليًا (مهم جدًا — شغّل ما يشغّله CI)

```bash
# الواجهة الأمامية (Frontend)
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm test

# الخادم (Backend)
cd server
npx tsc --noEmit
npm test
cd ..
```

> لا ترفع قبل أن تنجح هذه الأوامر محليًا.

## ٥. ادفع الفرع

```bash
git push -u origin feat/اسم-الميزة     # ‏-u أول مرة فقط
```

## ٦. افتح Pull Request

```bash
gh pr create --base main --head feat/اسم-الميزة \
  --title "feat: عنوان واضح" \
  --body "ماذا تغيّر ولماذا"
```

أو من واجهة GitHub بزر **New pull request**.

## ٧. راقب فحوصات CI

```bash
gh pr checks                # حالة الفحوصات للـ PR الحالي
gh pr view                  # تفاصيل الـ PR
gh run view <RUN_ID> --log-failed   # اقرأ سجل الفحص الفاشل
```

أصلح ← `git add` ← `git commit` ← `git push` (يعيد CI التشغيل تلقائيًا).

## ٨. حلّ تعارض الدمج (Conflict)

```bash
git checkout feat/اسم-الميزة
git fetch origin
git merge origin/main          # ادمج main داخل فرعك
# عدّل الملفات المتعارضة وأزل علامات <<<<<<< ======= >>>>>>>
git add <الملفات-المحلولة>
git commit                     # يكمل الدمج
git push
```

## ٩. ادمج الـ PR (فقط بعد أن تصبح كل الفحوصات خضراء)

```bash
gh pr merge <رقم> --squash --delete-branch
```

- `--squash` يدمج كل الـ commits في commit واحد نظيف
- `--delete-branch` يحذف الفرع بعد الدمج

## ١٠. نظّف بعد الدمج

```bash
git checkout main
git pull origin main
git remote prune origin        # نظّف الإشارات للفروع المحذوفة
```

---

## التراجع بعد الدمج (Undo)

> ما دام `main` مشتركًا ومدفوعًا، فضّل `git revert`. ينشئ commit جديدًا يُلغي
> التغيير دون حذف التاريخ.

### الخيار أ — من واجهة GitHub (الأسهل)
1. افتح الـ PR المدموج.
2. اضغط زر **Revert** في الأسفل.
3. ينشئ GitHub‏ PR جديدًا يعكس التغييرات — راجعه وادمجه.

### الخيار ب — من سطر الأوامر

```bash
git checkout main
git pull origin main
git log --oneline -10          # اعرف هاش الـ commit المدموج

# لو squash merge (‏commit واحد عادي):
git revert <HASH>

# لو merge commit حقيقي (له والدان):
git revert -m 1 <HASH>

git push origin main
```

### التراجع عن عدة دمجات

```bash
git revert <HASH_A> <HASH_B>          # commit تراجع منفصل لكل واحد
# أو نطاق متتابع:
git revert <الأقدم>^..<الأحدث>
git push origin main
```

### جرّب قبل الدفع

```bash
git checkout -b revert-test main
git revert <HASH>
# npm test / npm run build
git checkout main && git branch -D revert-test   # لو غير راضٍ
```

### `git reset` — للحالات الخاصة فقط
استخدمها فقط إذا لم تُدفع التغييرات بعد، أو على فرعك الخاص:

```bash
git reset --hard <HASH_قبل_الدمج>
git push --force-with-lease origin <فرعك>
```

> لا تفعل هذا على `main` المشترك — سيكسر عمل كل من سحب الكود.

### التراجع عن الـ revert نفسه
```bash
git revert <HASH_الخاص_بالـrevert>     # يعيد إدخال التغيير
```

---

## مرجع سريع

| الأمر | الوظيفة |
|---|---|
| `gh pr list` | قائمة الـ PRs المفتوحة |
| `gh pr list --state all` | كل الـ PRs (مفتوح/مغلق/مدموج) |
| `gh pr checks <رقم>` | حالة فحوصات CI |
| `gh pr view <رقم> --web` | فتح الـ PR في المتصفح |
| `gh pr close <رقم>` | إغلاق PR دون دمج |
| `gh pr merge <رقم> --squash --delete-branch` | دمج وتنظيف |
| `git log --oneline -10` | آخر ١٠ commits |
| `git branch -a` | كل الفروع (محلي + remote) |
| `gh auth status` | التأكد من مصادقة GitHub CLI |

| الموقف | الأمر |
|---|---|
| مدموج ومدفوع على `main` | `git revert <hash>` ثم `git push` |
| من واجهة GitHub | زر **Revert** على الـ PR |
| لم يُدفع بعد / فرعك الخاص | `git reset --hard` |
| التراجع عن merge commit حقيقي | `git revert -m 1 <hash>` |

</div>
