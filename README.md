
**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in OnSpace.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

## التشغيل والتطوير (Local Development)

### 1. تشغيل قاعدة البيانات (PostgreSQL 16)
تأكد من وجود Docker ثم قم بتشغيل الأمر التالي:
```bash
docker compose up -d
```

### 2. تنصيب المكتبات
```bash
npm install
```

### 3. تشغيل وضع التطوير (Frontend + Backend معاً)
```bash
npm run dev
```
> ✅ هذا الأمر الواحد يشغّل **الواجهة** (Vite على المنفذ 5173) و**السيرفر** (Express على المنفذ 4000) في نفس الوقت تلقائياً.

#### أوامر إضافية (اختيارية):
```bash
npm run client   # تشغيل الواجهة فقط
npm run server   # تشغيل السيرفر فقط
```

---

## النشر (Deployment)

### النشر على GitHub Pages
المشروع معد مسبقاً للنشر على GitHub Pages. بمجرد الانتهاء من التعديلات، استخدم هذا الأمر:
```bash
npm run deploy
```

---

## التقنيات المستخدمة
- **Frontend:** React + Vite + TypeScript
- **Backend:** Express + Prisma ORM
- **Styling:** Tailwind CSS + Shadcn UI
- **Database:** PostgreSQL 16 (via Docker)
- **Deployment:** GitHub Pages

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.