import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewData {
  headers: string[];
  rows: any[];
}

export default function DataMigration() {
  const [targetModule, setTargetModule] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const modules = [
    { id: 'students', name: 'الطلاب والأرصدة الافتتاحية' },
    { id: 'accounts', name: 'الدليل المحاسبي (شجرة الحسابات)' },
    { id: 'inventory', name: 'جرد المخازن والأصناف' },
    { id: 'suppliers', name: 'بيانات الموردين' }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.xlsx') && !uploadedFile.name.endsWith('.xls') && !uploadedFile.name.endsWith('.csv')) {
      toast.error('يرجى رفع ملف Excel أو CSV صحيح');
      return;
    }

    setFile(uploadedFile);
    processExcelFile(uploadedFile);
  };

  const processExcelFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Read first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (array of arrays to easily get headers)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).filter((row: any) => row.length > 0);
          
          setPreviewData({ headers, rows });
          toast.success(`تم قراءة الملف بنجاح (${rows.length} سجل)`);
        } else {
          toast.error('الملف فارغ ولا يحتوي على بيانات');
          setPreviewData(null);
        }
      } catch (error) {
        console.error('Error parsing excel:', error);
        toast.error('حدث خطأ أثناء قراءة الملف. تأكد من أنه غير تالف.');
        setPreviewData(null);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      toast.error('حدث خطأ أثناء قراءة الملف');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleExecuteMigration = async () => {
    if (!targetModule) {
      toast.error('الرجاء اختيار الوحدة المستهدفة أولاً');
      return;
    }
    if (!previewData || previewData.rows.length === 0) {
      toast.error('لا توجد بيانات صالحة للاستيراد');
      return;
    }

    setIsUploading(true);
    
    try {
      // Get auth headers from local storage (handled by authStore usually, but here we can just use localStorage)
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/migration/${targetModule}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: previewData.rows }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'فشل ترحيل البيانات لخادم النظام');
      }

      const resData = await response.json();
      toast.success(resData.message || 'تم ترحيل البيانات بنجاح وإنشاء القيود الافتتاحية!');
      
      setFile(null);
      setPreviewData(null);
    } catch (error: any) {
      console.error('Migration execution error:', error);
      toast.error(error.message || 'حدث خطأ أثناء الاتصال بالخادم لترحيل البيانات');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!targetModule) return;

    let columns: string[] = [];
    let fileName = '';

    switch (targetModule) {
      case 'students':
        columns = [
          'الرقم القومي (National ID)*', 'اسم الطالب (Name)*', 'اسم ولي الأمر (Guardian Name)*', 'رقم هاتف ولي الأمر (Guardian Phone)*',
          'المرحلة (Stage)*', 'الصف الدراسي (Grade)*', 'المسار (Track: local/international)', 'السنة الدراسية (Academic Year)',
          'الفصل (Class Name)', 'تاريخ الميلاد (Birth Date)', 'تاريخ الالتحاق (Enrollment Date)', 'العنوان (Address)',
          'حالة الطالب (Status: admitted/applied)', 'له إخوة؟ (Has Siblings: true/false)', 'رقم خط الباص (Bus Route ID)',
          'مصروفات التعليم (Tuition Fees)', 'مصروفات الكتب (Books Fees)', 'مصروفات الزي (Uniform Fees)', 'مصروفات الباص (Bus Fees)',
          'مصروفات أخرى (Other Fees)', 'متأخرات/رصيد افتتاحي (Arrears/Opening Balance)', 'قيمة الخصم (Discount Amount)', 'المدفوع مسبقاً (Paid Amount)'
        ];
        fileName = 'Students_Template_Full.xlsx';
        break;
      case 'accounts':
        columns = [
          'كود الحساب (Account Code)*', 'اسم الحساب بالعربية (Name AR)*', 'اسم الحساب بالإنجليزية (Name EN)',
          'النوع (Type: asset/liability/equity/revenue/expense)*', 'طبيعة الحساب (Normal Balance: debit/credit)*',
          'المستوى (Level: 1/2/3/4/5)', 'كود الحساب الأب (Parent Account Code)', 'يقبل إدخال يدوي؟ (Allow Manual Entry: true/false)',
          'مفعل؟ (Is Active: true/false)', 'الرصيد الافتتاحي (Opening Balance)'
        ];
        fileName = 'Accounts_Template_Full.xlsx';
        break;
      case 'inventory':
        columns = [
          'كود الصنف/الباركود (Item Code)*', 'اسم الصنف (Item Name)*', 'التصنيف/الفئة (Category)*', 'نوع الصنف (Type: sale/consumable)',
          'الوحدة الأساسية (Unit: قطعة/كرتونة)', 'تكلفة الشراء (Unit Cost)', 'سعر البيع (Unit Price)',
          'الرصيد الافتتاحي المتاح (Quantity)', 'الحد الأدنى للطلب (Min Quantity)', 'الحد الأقصى (Max Quantity)',
          'الصف الدراسي المرتبط (Grade)', 'الوصف الملاحظات (Description)'
        ];
        fileName = 'Inventory_Template_Full.xlsx';
        break;
      case 'suppliers':
        columns = [
          'اسم المورد (Supplier Name)*', 'الشخص المسؤول (Contact Person)', 'رقم الهاتف (Phone)*', 'البريد الإلكتروني (Email)',
          'العنوان (Address)', 'الرقم الضريبي (Tax ID)', 'السجل التجاري (Commercial Record)', 'تصنيف المورد (Category)',
          'الرصيد الافتتاحي (Opening Balance: موجب=دائن/سالب=مدين)', 'مفعل؟ (Is Active: true/false)'
        ];
        fileName = 'Suppliers_Template_Full.xlsx';
        break;
      default:
        columns = ['البيانات'];
        fileName = 'Template.xlsx';
    }

    const worksheet = XLSX.utils.aoa_to_sheet([columns]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <ArrowRightLeft className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">هجرة البيانات (Data Migration)</h1>
          <p className="text-sm text-muted-foreground mt-1">استيراد السجلات والأرصدة الافتتاحية من الأنظمة القديمة عبر ملفات Excel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-[Noto_Kufi_Arabic]">إعدادات الاستيراد</CardTitle>
            <CardDescription>حدد القسم وارفع ملف البيانات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">1. الوحدة المستهدفة (القسم)</label>
              <Select value={targetModule} onValueChange={setTargetModule}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم..." />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetModule && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-start gap-2 border border-blue-100">
                <FileSpreadsheet className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">قالب الاستيراد المعتمد</p>
                  <p className="text-xs opacity-90 mb-2">يرجى تحميل القالب المخصص لهذا القسم وتعبئته بالبيانات لتجنب أخطاء المطابقة.</p>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="text-xs font-bold underline hover:text-blue-600 transition-colors"
                  >
                    تحميل القالب (.xlsx)
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">2. رفع ملف البيانات (Excel / CSV)</label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {isProcessing ? (
                  <Loader2 className="size-8 text-primary animate-spin mb-2" />
                ) : file ? (
                  <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                ) : (
                  <UploadCloud className="size-8 text-slate-400 mb-2" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {file ? file.name : 'اضغط لاختيار ملف أو قم بسحبه هنا'}
                </span>
                <span className="text-xs text-slate-400 mt-1">يجب أن يكون الملف مطابقاً للقالب</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-[Noto_Kufi_Arabic]">معاينة البيانات (Data Preview)</CardTitle>
            <CardDescription>
              {previewData ? `تم العثور على ${previewData.rows.length} سجل جاهز للاستيراد` : 'قم برفع الملف لرؤية ومعاينة البيانات قبل استيرادها'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!previewData ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                <FileSpreadsheet className="size-12 mb-3 opacity-20" />
                <p>لا يوجد بيانات لعرضها حالياً</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm flex gap-2">
                  <AlertTriangle className="size-5 shrink-0" />
                  <p>تأكد من مطابقة أسماء الأعمدة المعروضة مع القالب المعتمد قبل تنفيذ الهجرة. البيانات المعروضة تمثل أول 10 سجلات للمعاينة.</p>
                </div>
                
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        {previewData.headers.map((h, i) => (
                          <th key={i} className="p-3 border-b whitespace-nowrap font-semibold">{h || `عمود ${i+1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b last:border-0 hover:bg-slate-50">
                          {previewData.headers.map((_, colIndex) => (
                            <td key={colIndex} className="p-3 whitespace-nowrap max-w-[200px] truncate">
                              {row[colIndex] !== undefined ? String(row[colIndex]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto font-bold"
                    onClick={handleExecuteMigration}
                    disabled={isUploading || !targetModule}
                  >
                    {isUploading ? (
                      <><Loader2 className="size-5 ml-2 animate-spin" /> جاري الترحيل لمعالجة السجلات...</>
                    ) : (
                      <><UploadCloud className="size-5 ml-2" /> تنفيذ الهجرة (استيراد البيانات)</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
