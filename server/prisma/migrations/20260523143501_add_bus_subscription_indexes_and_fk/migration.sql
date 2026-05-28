-- CreateIndex
CREATE INDEX "BusSubscription_routeId_idx" ON "BusSubscription"("routeId");

-- CreateIndex
CREATE INDEX "BusSubscription_studentId_idx" ON "BusSubscription"("studentId");

-- CreateIndex
CREATE INDEX "BusSubscription_academicYear_status_idx" ON "BusSubscription"("academicYear", "status");

-- AddForeignKey
ALTER TABLE "BusSubscription" ADD CONSTRAINT "BusSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
