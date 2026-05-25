import { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, stageLabels } from '@/lib/utils';
import type { Student, Payment, Stage } from '@/types';

interface Props {
  academicYear: string;
  students: Student[];
  payments: Payment[];
}

const STAGES: Stage[] = ['kg', 'primary', 'preparatory', 'secondary'];

export default function YearEndReport({ academicYear, students, payments }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const activeStudents = students.filter(
    (s) => s.academicYear === academicYear && ['admitted', 'active'].includes(s.status)
  );

  const totalFees = activeStudents.reduce((sum, s) => sum + Number(s.totalFees), 0);
  const totalPaid = activeStudents.reduce((sum, s) => sum + Number(s.paidAmount), 0);
  const totalOutstanding = totalFees - totalPaid;
  const collectionRate = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  const byStage = STAGES.map((stage) => {
    const stageStudents = activeStudents.filter((s) => s.stage === stage);
    return {
      stage,
      count: stageStudents.length,
      fees: stageStudents.reduce((sum, s) => sum + Number(s.totalFees), 0),
      paid: stageStudents.reduce((sum, s) => sum + Number(s.paidAmount), 0),
      outstanding: stageStudents.reduce((sum, s) => sum + Math.max(0, Number(s.totalFees) - Number(s.paidAmount)), 0),
    };
  }).filter((r) => r.count > 0);

  const nonPayers = activeStudents
    .filter((s) => Number(s.paidAmount) < Number(s.totalFees))
    .sort((a, b) => (Number(b.totalFees) - Number(b.paidAmount)) - (Number(a.totalFees) - Number(a.paidAmount)));

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`تقرير-ختامي-${academicYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4 ml-2" /> طباعة
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <Download className="size-4 ml-2" /> تصدير PDF
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6">
        <h2 className="text-xl font-bold text-center font-[Noto_Kufi_Arabic]">
          التقرير الختامي للسنة الدراسية {academicYear}
        </h2>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الرسوم', value: formatCurrency(totalFees), color: 'text-slate-700' },
            { label: 'المحصّل', value: formatCurrency(totalPaid), color: 'text-emerald-600' },
            { label: 'المتبقي', value: formatCurrency(totalOutstanding), color: 'text-red-600' },
            { label: 'نسبة التحصيل', value: `${collectionRate}%`, color: collectionRate >= 80 ? 'text-emerald-600' : 'text-amber-600' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By Stage */}
        <Card>
          <CardHeader><CardTitle className="text-base">التوزيع حسب المرحلة</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المرحلة</TableHead>
                  <TableHead className="text-right">عدد الطلاب</TableHead>
                  <TableHead className="text-right">الرسوم</TableHead>
                  <TableHead className="text-right">المحصّل</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStage.map((row) => (
                  <TableRow key={row.stage}>
                    <TableCell className="font-medium">{stageLabels[row.stage]}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.fees)}</TableCell>
                    <TableCell className="tabular-nums text-emerald-600">{formatCurrency(row.paid)}</TableCell>
                    <TableCell className="tabular-nums text-red-600">{formatCurrency(row.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Non-Payers */}
        {nonPayers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                الطلاب غير المسدِّدين بالكامل
                <Badge variant="destructive">{nonPayers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonPayers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{stageLabels[s.stage]}</TableCell>
                      <TableCell className="tabular-nums text-red-600 font-bold">
                        {formatCurrency(Number(s.totalFees) - Number(s.paidAmount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
