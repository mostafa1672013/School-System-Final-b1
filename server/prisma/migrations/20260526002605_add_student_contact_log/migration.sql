-- CreateTable
CREATE TABLE "StudentContactLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentContactLog_studentId_idx" ON "StudentContactLog"("studentId");

-- AddForeignKey
ALTER TABLE "StudentContactLog" ADD CONSTRAINT "StudentContactLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
