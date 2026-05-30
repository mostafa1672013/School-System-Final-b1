import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  Search, 
  Eye, 
  RefreshCw, 
  FileJson,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/stores/authStore';

interface DBTable {
  key: string;
  name: string;
  count: number;
}

export default function DatabaseManagement() {
  const [tables, setTables] = useState<DBTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingTables, setLoadingTables] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [backingUp, setBackingUp] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [confirmRestore, setConfirmRestore] = useState<boolean>(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [inspectorRow, setInspectorRow] = useState<any | null>(null);

  const checkDbStatus = async () => {
    try {
      const res = await fetch('/api/database/status', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDbStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch (error) {
      setDbStatus('disconnected');
    }
  };

  // Fetch all tables on load
  const fetchTables = async () => {
    setLoadingTables(true);
    checkDbStatus();
    try {
      const res = await fetch('/api/database/tables', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('فشل تحميل الجداول');
      const data = await res.json();
      setTables(data);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحميل الجداول المحفوظة');
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchTables();
    checkDbStatus();
  }, []);

  // Fetch rows for selected table
  const fetchTableData = async (tableName: string) => {
    if (!tableName) return;
    setLoadingData(true);
    setSearchTerm('');
    try {
      const res = await fetch(`/api/database/tables/${tableName}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('فشل تحميل السجلات');
      const data = await res.json();
      setTableData(data);
    } catch (error) {
      console.error(error);
      toast.error(`فشل تحميل بيانات الجدول ${tableName}`);
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    fetchTableData(tableName);
  };

  // Perform JSON database backup
  const handleBackup = async () => {
    setBackingUp(true);
    toast.info('جاري إعداد نسخة احتياطية من قاعدة البيانات...');
    try {
      const res = await fetch('/api/database/backup', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('فشل تصدير النسخة الاحتياطية');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school_database_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تحميل النسخة الاحتياطية بنجاح بنسق JSON');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تصدير قاعدة البيانات');
    } finally {
      setBackingUp(false);
    }
  };

  // Perform JSON database restore
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) {
      toast.error('الرجاء اختيار ملف النسخة الاحتياطية أولاً');
      return;
    }
    if (!confirmRestore) {
      toast.error('الرجاء تحديد خانة الموافقة على الاستبدال لتأكيد العملية');
      return;
    }

    const confirmTwice = window.confirm(
      'تحذير نهائي: هل أنت متأكد تماماً من استرجاع هذه النسخة؟ هذه العملية ستقوم بمسح جميع بيانات النظام الحالية ولا يمكن التراجع عنها!'
    );
    if (!confirmTwice) return;

    setRestoring(true);
    toast.info('جاري مسح الجداول واستيراد البيانات الجديدة...');

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const jsonText = event.target?.result as string;
          const parsed = JSON.parse(jsonText);

          if (!parsed.data || !parsed.version) {
            throw new Error('ملف النسخ الاحتياطي غير صالح أو تالف');
          }

          const res = await fetch('/api/database/restore', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ data: parsed.data })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'فشل استرجاع النسخة الاحتياطية');
          }

          toast.success('تم استرجاع قاعدة البيانات وإعادة البناء بنجاح!');
          setRestoreFile(null);
          setConfirmRestore(false);
          fetchTables();
          if (selectedTable) {
            fetchTableData(selectedTable);
          }
        } catch (innerError: any) {
          console.error(innerError);
          toast.error(innerError?.message || 'فشل قراءة أو تحليل ملف النسخة الاحتياطية');
        } finally {
          setRestoring(false);
        }
      };

      fileReader.readAsText(restoreFile);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ فني أثناء قراءة ملف الاسترجاع');
      setRestoring(false);
    }
  };

  // Perform database wipe/reset
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmReset) {
      toast.error('الرجاء تحديد خانة الموافقة على تصفير قاعدة البيانات');
      return;
    }

    const confirmFirst = window.confirm(
      'تحذير أمني خطير: هل أنت متأكد تماماً من تصفير قاعدة البيانات؟ سيتم مسح كافة الطلاب والحسابات المالية والمبيعات والمخزن نهائياً!'
    );
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(
      'تأكيد أخير: هل تدرك تماماً أنه لا يمكن التراجع عن هذه الخطوة أبداً؟ سيتم الاحتفاظ بحسابك الحالي فقط لتتمكن من مواصلة استخدام النظام.'
    );
    if (!confirmSecond) return;

    setResetting(true);
    toast.info('جاري تصفير قاعدة البيانات وإعادة تهيئة السجلات...');

    try {
      const res = await fetch('/api/database/reset', {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'فشل تصفير قاعدة البيانات');
      }

      const resData = await res.json();
      toast.success(resData.message || 'تم تصفير قاعدة البيانات بنجاح!');
      setConfirmReset(false);
      fetchTables();
      if (selectedTable) {
        fetchTableData(selectedTable);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'حدث خطأ أثناء محاولة تصفير قاعدة البيانات');
    } finally {
      setResetting(false);
    }
  };

  // Filter keys and columns
  const getTableColumns = (dataArray: any[]) => {
    if (!dataArray || dataArray.length === 0) return [];
    // Extract keys of first object, ignoring sub-objects/relations if possible
    return Object.keys(dataArray[0]).filter(key => {
      const val = dataArray[0][key];
      return typeof val !== 'object' || val === null || Array.isArray(val);
    });
  };

  const columns = getTableColumns(tableData);

  const filteredData = tableData.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 text-right font-[Noto_Kufi_Arabic]" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
              <Database className="size-7 text-primary animate-pulse" />
              <span>إدارة قاعدة البيانات والنظام</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              صيانة النظام، عمل نسخ احتياطية كاملة، استعادة الملفات واستعلام سجلات جداول قاعدة البيانات.
            </p>
          </div>
          
          {/* Connection Status Indicator */}
          <div className="flex items-center pt-2 md:pt-0">
            {dbStatus === 'connected' && (
              <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shadow-sm">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                </span>
                قاعدة البيانات: متصلة
              </span>
            )}
            {dbStatus === 'disconnected' && (
              <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-full animate-pulse shadow-sm">
                <span className="relative flex size-2">
                  <span className="relative inline-flex rounded-full size-2 bg-rose-500"></span>
                </span>
                قاعدة البيانات: غير متصلة
              </span>
            )}
            {dbStatus === 'loading' && (
              <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200 rounded-full animate-pulse">
                <span className="animate-spin size-2.5 rounded-full border-2 border-slate-400 border-t-transparent"></span>
                جاري التحقق...
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={fetchTables} 
          disabled={loadingTables}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border"
        >
          <RefreshCw className={`size-4 ${loadingTables ? 'animate-spin' : ''}`} />
          تحديث الهيكل
        </button>
      </div>

      {/* Backup, Restore and Reset Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Backup Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Download className="size-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">حفظ نسخة احتياطية كاملة</h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              قم بتحميل ملف نسخة احتياطية شاملة بنسق <strong>JSON</strong> يحتوي على كافة جداول النظام: الحسابات المالية، القيود المحاسبية، السجلات المدرسية للطلاب، كشوف المبيعات والمخازن وإعدادات الصلاحيات.
            </p>
            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50 flex gap-3 text-xs text-blue-700">
              <CheckCircle className="size-4 shrink-0 mt-0.5" />
              <span>النسخ المحملة آمنة، ومتوافقة تماماً للاسترجاع لاحقاً على هذا الخادم.</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
            >
              <Download className={`size-5 ${backingUp ? 'animate-bounce' : ''}`} />
              {backingUp ? 'جاري التصدير والتنزيل...' : 'إنشاء وتنزيل نسخة احتياطية (.json)'}
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-6">
          <form onSubmit={handleRestore} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                <Upload className="size-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">استرجاع نسخة احتياطية</h2>
            </div>
            
            <p className="text-sm text-slate-500 leading-relaxed">
              اختر ملف نسخة احتياطية صالحة من جهازك لاسترجاع البيانات.
            </p>

            <div className="bg-red-50 rounded-lg p-4 border border-red-150 space-y-3">
              <div className="flex gap-2 text-sm font-bold text-red-800">
                <AlertTriangle className="size-5 shrink-0" />
                <span>تحذير هام جداً!</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                استرجاع النسخة الاحتياطية سيقوم بمسح كامل البيانات الحالية وإعادة تشكيل قاعدة البيانات. لن تتمكن من استرجاع البيانات الحالية إلا إذا قمت بعمل نسخة احتياطية لها أولاً.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:ml-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border rounded-lg p-2"
              />
              
              <label className="flex items-center gap-2 select-none cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={confirmRestore}
                  onChange={(e) => setConfirmRestore(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 size-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">
                  أوافق وأؤكد رغبتي في استبدال جميع البيانات الحالية بشكل كامل
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={restoring || !restoreFile || !confirmRestore}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className={`size-5 ${restoring ? 'animate-spin' : ''}`} />
                {restoring ? 'جاري الاستيراد وإعادة البناء...' : 'استرجاع قاعدة البيانات من الملف المختار'}
              </button>
            </div>
          </form>
        </div>

        {/* Reset / Wipe Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 flex flex-col justify-between">
          <form onSubmit={handleReset} className="space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                  <AlertTriangle className="size-6 text-amber-500 animate-bounce" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">تصفير قاعدة البيانات</h2>
              </div>
              
              <p className="text-sm text-slate-500 leading-relaxed">
                مسح كافة البيانات وإعادة تهيئة النظام بالكامل ليكون جاهزاً لإدخال بيانات جديدة من الصفر.
              </p>

              <div className="bg-amber-50 rounded-lg p-3 border border-amber-150 space-y-2">
                <p className="text-xs text-amber-850 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>تأثير التصفير الشامل:</span>
                </p>
                <ul className="text-[10px] text-amber-700 list-disc list-inside space-y-1 pr-1 leading-normal">
                  <li>مسح كافة الطلاب والمعاملات المالية وقوائم الدفع</li>
                  <li>حذف شجرة الحسابات والقيود ودفاتر الأستاذ بالكامل</li>
                  <li>تصفير المخازن وعمليات جرد الأصناف بالكامل</li>
                  <li>حذف جميع المستخدمين الآخرين تماماً</li>
                  <li><strong>سيتم الحفاظ على حسابك النشط الحالي فقط لتتمكن من المتابعة</strong></li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 select-none cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={confirmReset}
                  onChange={(e) => setConfirmReset(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 size-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium leading-tight">
                  أوافق وأؤكد رغبتي في مسح وتصفير كافة سجلات النظام نهائياً
                </span>
              </label>

              <button
                type="submit"
                disabled={resetting || !confirmReset}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className={`size-5 ${resetting ? 'animate-spin' : ''}`} />
                {resetting ? 'جاري التصفير وإعادة التهيئة...' : 'تصفير قاعدة البيانات الآن'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Database Explorer / Query Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <FileJson className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">مستعرض ومستعلم جداول قاعدة البيانات</h2>
                <p className="text-xs text-slate-500 mt-0.5">مراجعة والاطلاع المباشر على بيانات وسجلات الجداول (استعلام فقط / للقراءة فقط).</p>
              </div>
            </div>
            
            {/* Table Selector */}
            <div className="w-full md:w-72">
              <select
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">اختر الجدول للمراجعة...</option>
                {tables.map(t => (
                  <option key={t.key} value={t.key}>
                    {t.name} ({t.count} سجل)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedTable ? (
          <div className="p-6 space-y-4">
            
            {/* Table Search */}
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث في هذا الجدول بجميع القيم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <span className="text-xs text-slate-500">
                مستعلم: {filteredData.length} سجل من أصل {tableData.length}
              </span>
            </div>

            {/* Table Content */}
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="size-8 text-primary animate-spin" />
                <p className="text-sm text-slate-500">جاري الاستعلام من قاعدة البيانات...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-lg">
                <HelpCircle className="size-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">لا توجد بيانات مطابقة للبحث أو الجدول فارغ تماماً</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg max-h-[500px]">
                <table className="w-full text-sm text-right text-slate-600">
                  <thead className="text-xs text-slate-700 bg-slate-50 border-b sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="p-3 font-semibold text-center w-16">إجراء</th>
                      {columns.map(col => (
                        <th key={col} scope="col" className="p-3 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setInspectorRow(row)}
                            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
                            title="تفاصيل السجل كاملاً"
                          >
                            <Eye className="size-4" />
                          </button>
                        </td>
                        {columns.map(col => {
                          const val = row[col];
                          let rendered = '';
                          if (val === null || val === undefined) {
                            rendered = '-';
                          } else if (typeof val === 'boolean') {
                            rendered = val ? 'نعم' : 'لا';
                          } else if (typeof val === 'object') {
                            rendered = JSON.stringify(val);
                          } else {
                            rendered = String(val);
                          }
                          return (
                            <td key={col} className="p-3 whitespace-nowrap max-w-[200px] truncate" title={rendered}>
                              {rendered}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50/20">
            <Database className="size-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">الرجاء اختيار جدول من القائمة أعلاه لاستعراض السجلات</p>
          </div>
        )}
      </div>

      {/* Row Inspector Modal */}
      {inspectorRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Eye className="size-5 text-primary" />
                <span>تفاصيل السجل بالكامل (استعلام فقط)</span>
              </h3>
              <button 
                onClick={() => setInspectorRow(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
              >
                إغلاق
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs text-left overflow-x-auto" dir="ltr">
                <pre>{JSON.stringify(inspectorRow, null, 2)}</pre>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectorRow(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                إغلاق المستعرض
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
