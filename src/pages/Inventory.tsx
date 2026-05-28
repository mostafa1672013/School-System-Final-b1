import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2, Trash2, Pencil, Eye, Printer, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { useAuthStore } from '@/stores/authStore';
import { usePrintInventoryReport } from '@/hooks/usePrintInventoryReport';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import StatCard from '@/components/features/StatCard';
import type { InventoryItem, ItemCategory, InventoryCategory } from '@/types';


const txTypeOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'purchase', label: 'وارد (شراء)' },
    { value: 'sale', label: 'بيع' },
    { value: 'consumption', label: 'صرف (استهلاك)' },
    { value: 'adjustment', label: 'تعديل' }
];

export default function Inventory() {
    const { items, transactions, categories, loading, fetchItems, fetchTransactions, fetchCategories, addItem, updateItem, deleteItem, receiveStock, issueStock, addCategory, updateCategory, deleteCategory } = useInventoryStore();
    const { students } = useStudentsStore();
    const { user } = useAuthStore();
    const { printReport } = usePrintInventoryReport();

    useEffect(() => {
        fetchItems();
        fetchTransactions();
        fetchCategories();
    }, [fetchItems, fetchTransactions, fetchCategories]);

    // Search & Filter
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [txTypeFilter, setTxTypeFilter] = useState('all');
    const [txItemFilter, setTxItemFilter] = useState('all');

    // Add Item
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'books' as InventoryCategory,
        itemType: 'consumable' as 'sale' | 'consumable',
        quantity: 0,
        minQuantity: 10,
        maxQuantity: undefined as number | undefined,
        unit: 'قطعة',
        unitCost: 0,
        unitPrice: 0,
        grade: '',
        description: ''
    });

    // Edit Item
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        category: 'books' as InventoryCategory,
        itemType: 'consumable' as 'sale' | 'consumable',
        unit: '',
        unitCost: 0,
        unitPrice: 0,
        minQuantity: 10,
        maxQuantity: undefined as number | undefined,
        grade: '',
        description: ''
    });

    // Sheet
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetItem, setSheetItem] = useState<InventoryItem | null>(null);

    // Delete Confirm
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

    // Stock Operations
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [issueDialogOpen, setIssueDialogOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [qty, setQty] = useState(0);
    const [txNote, setTxNote] = useState('');
    const [txStudentId, setTxStudentId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [unitCostOverride, setUnitCostOverride] = useState<number | undefined>();
    const [receiveSubType, setReceiveSubType] = useState<'adjustment' | 'opening_balance'>('adjustment');
    const [subType, setSubType] = useState<'sale' | 'consumption'>('consumption');
    const [departmentName, setDepartmentName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync subType automatically when selectedItemId changes (initial value only)
    useEffect(() => {
        if (selectedItemId) {
            const selectedItem = items.find(i => i.id === selectedItemId);
            if (selectedItem) {
                if (selectedItem.itemType === 'consumable') {
                    setSubType('consumption');
                    setTxStudentId('');
                } else if (selectedItem.itemType === 'sale') {
                    setSubType('sale');
                    setDepartmentName('');
                }
            }
        }
    }, [selectedItemId, items]);

    // Handle subType change manually
    const handleSubTypeChange = (newSubType: 'sale' | 'consumption') => {
        setSubType(newSubType);
        if (newSubType === 'consumption') {
            setTxStudentId('');
        } else if (newSubType === 'sale') {
            setDepartmentName('');
        }
    };

    // Check if selected student has due amount
    const getStudentDueAmount = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return 0;
        return student.totalFees - student.paidAmount;
    };

    // Category Management
    const [catDialogOpen, setCatDialogOpen] = useState(false);
    const [newCatKey, setNewCatKey] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [editingCat, setEditingCat] = useState<ItemCategory | null>(null);
    const [editCatName, setEditCatName] = useState('');

    // Computed
    const filtered = useMemo(() => {
        return items.filter((i) => {
            const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
            const matchCat = activeTab === 'all' || i.category === activeTab;
            return matchSearch && matchCat;
        });
    }, [items, search, activeTab]);

    const lowStockItems = items.filter((i) => i.quantity <= i.minQuantity);
    const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0);

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(tx => txTypeFilter === 'all' || tx.subType === txTypeFilter)
            .filter(tx => txItemFilter === 'all' || tx.itemId === txItemFilter);
    }, [transactions, txTypeFilter, txItemFilter]);

    const sheetTransactions = useMemo(() => {
        if (!sheetItem) return [];
        return transactions.filter(tx => tx.itemId === sheetItem.id);
    }, [transactions, sheetItem]);

    // Category tabs computed
    const categoryTabs = useMemo(() => [
        { value: 'all', label: 'الكل' },
        ...categories.map(c => ({ value: c.key, label: c.name }))
    ], [categories]);

    // Category map for print
    const categoryMap = useMemo(() =>
        Object.fromEntries(categories.map(c => [c.key, c.name])), [categories]
    );

    // Handlers - Add
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name.trim()) {
            toast.error('اسم الصنف مطلوب');
            return;
        }

        setIsSubmitting(true);
        const success = await addItem({
            ...newItem,
            lastUpdated: new Date().toISOString().split('T')[0]
        });

        if (success) {
            toast.success('تم إضافة الصنف بنجاح');
            setAddDialogOpen(false);
            setNewItem({
                name: '',
                category: 'books',
                itemType: 'consumable',
                quantity: 0,
                minQuantity: 10,
                maxQuantity: undefined,
                unit: 'قطعة',
                unitCost: 0,
                unitPrice: 0,
                grade: '',
                description: ''
            });
        } else {
            toast.error('فشل إضافة الصنف');
        }
        setIsSubmitting(false);
    };

    // Handlers - Edit
    const openEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setEditForm({
            name: item.name,
            category: item.category as InventoryCategory,
            itemType: item.itemType as 'sale' | 'consumable',
            unit: item.unit,
            unitCost: item.unitCost,
            unitPrice: item.unitPrice,
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
            grade: item.grade || '',
            description: item.description || ''
        });
        setEditDialogOpen(true);
    };

    const handleEditItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        if (!editForm.name.trim()) {
            toast.error('اسم الصنف مطلوب');
            return;
        }

        setIsSubmitting(true);
        const success = await updateItem(editingItem.id, {
            ...editForm,
            lastUpdated: new Date().toISOString().split('T')[0]
        });

        if (success) {
            toast.success('تم تحديث الصنف بنجاح');
            setEditDialogOpen(false);
            setEditingItem(null);
        } else {
            toast.error('فشل تحديث الصنف');
        }
        setIsSubmitting(false);
    };

    // Handlers - Delete
    const openDeleteConfirm = (item: InventoryItem) => {
        setDeletingItem(item);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;
        setIsSubmitting(true);
        const success = await deleteItem(deletingItem.id);

        if (success) {
            toast.success('تم حذف الصنف بنجاح');
            setDeleteConfirmOpen(false);
            setDeletingItem(null);
        } else {
            toast.error('فشل حذف الصنف');
        }
        setIsSubmitting(false);
    };

    // Handlers - Receive
    const handleReceive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId || qty <= 0) {
            toast.error('تحقق من الصنف والكمية');
            return;
        }

        setIsSubmitting(true);
        const success = await receiveStock({
            itemId: selectedItemId,
            quantity: qty,
            subType: receiveSubType,
            supplierName: supplierName || undefined,
            unitCost: unitCostOverride,
            notes: txNote || undefined,
            performedBy: user?.name || 'Unknown',
            performedByUserId: user?.id
        });

        if (success) {
            toast.success('تم استلام الكمية بنجاح');
            setReceiveDialogOpen(false);
            resetTxForm();
        } else {
            toast.error('فشل استلام الكمية');
        }
        setIsSubmitting(false);
    };

    // Handlers - Issue
    const handleIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId || qty <= 0) {
            toast.error('تحقق من الصنف والكمية');
            return;
        }

        // Check if student has due amount for sales
        if (subType === 'sale' && txStudentId) {
            const dueAmount = getStudentDueAmount(txStudentId);
            if (dueAmount > 0) {
                toast.error(`لا يمكن إتمام العملية. الطالب عليه مستحقات بقيمة ${formatCurrency(dueAmount)}. برجاء التوجه للحسابات أولاً.`);
                return;
            }
        }

        setIsSubmitting(true);
        const student = students.find((s) => s.id === txStudentId);

        const success = await issueStock({
            itemId: selectedItemId,
            quantity: qty,
            subType,
            departmentName: subType === 'consumption' ? departmentName || undefined : undefined,
            studentId: subType === 'sale' ? txStudentId : undefined,
            studentName: subType === 'sale' && student ? student.name : undefined,
            notes: txNote || undefined,
            performedBy: user?.name || 'Unknown',
            performedByUserId: user?.id
        });

        if (success) {
            toast.success('تم صرف الكمية بنجاح');
            setIssueDialogOpen(false);
            resetTxForm();
        } else {
            toast.error('فشل صرف الكمية');
        }
        setIsSubmitting(false);
    };

    const resetTxForm = () => {
        setSelectedItemId('');
        setQty(0);
        setTxNote('');
        setTxStudentId('');
        setSupplierName('');
        setUnitCostOverride(undefined);
        setReceiveSubType('adjustment');
        setSubType('consumption');
        setDepartmentName('');
    };

    const getSubTypeBadgeColor = (subType?: string) => {
        switch (subType) {
            case 'purchase':
                return 'bg-green-100 text-green-700 hover:bg-green-100';
            case 'sale':
                return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
            case 'consumption':
                return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
            default:
                return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
        }
    };

    // Category Management Handlers
    const handleAddCategory = async () => {
        if (!newCatKey.trim() || !newCatName.trim()) {
            toast.error('المفتاح والاسم مطلوبان');
            return;
        }
        const success = await addCategory({ key: newCatKey, name: newCatName });
        if (success) {
            toast.success('تم إضافة التصنيف بنجاح');
            setNewCatKey('');
            setNewCatName('');
        } else {
            toast.error('فشل إضافة التصنيف');
        }
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editCatName.trim()) {
            toast.error('الاسم مطلوب');
            return;
        }
        const success = await updateCategory(id, editCatName);
        if (success) {
            toast.success('تم تحديث التصنيف بنجاح');
            setEditingCat(null);
        } else {
            toast.error('فشل تحديث التصنيف');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const result = await deleteCategory(id);
        if (result.success) {
            toast.success('تم حذف التصنيف بنجاح');
        } else {
            toast.error(result.error || 'فشل حذف التصنيف');
        }
    };

    const getSubTypeLabel = (subType?: string) => {
        switch (subType) {
            case 'purchase':
                return 'وارد';
            case 'sale':
                return 'بيع';
            case 'consumption':
                return 'صرف';
            default:
                return 'تعديل';
        }
    };

    const openSheetItem = (item: InventoryItem) => {
        setSheetItem(item);
        setSheetOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">{lowStockItems.length} أصناف تحت الحد الأدنى</AlertTitle>
                    <AlertDescription className="text-amber-800">
                        {lowStockItems.map(i => i.name).join('، ')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="إجمالي الأصناف" value={items.length.toString()} icon={Package} colorClass="teal" />
                <StatCard title="قيمة المخزن" value={formatCurrency(totalValue)} icon={Package} colorClass="emerald" />
                <StatCard title="أصناف تحت الحد الأدنى" value={lowStockItems.length.toString()} icon={AlertTriangle} colorClass="rose" trend={lowStockItems.length > 0 ? 'يحتاج إعادة طلب' : 'الكل بخير'} />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="بحث في الأصناف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                </div>
                <div className="flex gap-2">
                    {/* Print Report Button */}
                    <Button variant="outline" onClick={() => printReport(items, categoryMap)} disabled={loading || items.length === 0}>
                        <Printer className="size-4 ml-2" />
                        طباعة تقرير
                    </Button>

                    {/* Manage Categories Button */}
                    <Button variant="outline" onClick={() => setCatDialogOpen(true)}>
                        <Settings className="size-4 ml-2" />
                        إدارة التصنيفات
                    </Button>

                    {/* Receive Dialog */}
                    <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={isSubmitting}><ArrowDownToLine className="size-4 ml-2" />استلام</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">استلام بضاعة (تعديل / رصيد افتتاحي)</DialogTitle></DialogHeader>
                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertDescription className="text-blue-800 text-xs font-semibold">
                                    لإضافة مشتريات جديدة، يرجى التوجه إلى وحدة <a href="/purchasing" className="underline font-bold">دورة المشتريات</a>.
                                    هذه الشاشة مخصصة فقط للتسويات وإضافة الرصيد الافتتاحي.
                                </AlertDescription>
                            </Alert>
                            <form onSubmit={handleReceive} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>الصنف</Label>
                                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                                        <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                                        <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>نوع الاستلام</Label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="adjustment" checked={receiveSubType === 'adjustment'} onChange={() => setReceiveSubType('adjustment')} />
                                            تسوية الجرد (إضافة)
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="opening_balance" checked={receiveSubType === 'opening_balance'} onChange={() => setReceiveSubType('opening_balance')} />
                                            رصيد افتتاحي
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-2"><Label>الكمية</Label><Input type="number" required min={1} value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} /></div>
                                {receiveSubType === 'opening_balance' && (
                                    <div className="space-y-2"><Label>اسم المورد (اختياري)</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="مثال: شركة النيل للنشر" /></div>
                                )}
                                <div className="space-y-2">
                                    <Label>تكلفة الوحدة (اختياري) - ترك فارغ لاستخدام التكلفة المسجلة</Label>
                                    <Input type="number" min={0} step={0.01} value={unitCostOverride || ''} onChange={(e) => setUnitCostOverride(e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                                <div className="space-y-2"><Label>ملاحظات</Label><Input value={txNote} onChange={(e) => setTxNote(e.target.value)} /></div>
                                <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setReceiveDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جاري...' : 'تأكيد الاستلام'}</Button></div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Issue Dialog */}
                    <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={isSubmitting}><ArrowUpFromLine className="size-4 ml-2" />صرف</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">صرف بضاعة</DialogTitle></DialogHeader>
                            <form onSubmit={handleIssue} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>الصنف</Label>
                                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                                        <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                                        <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} (المتاح: {i.quantity})</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>نوع الصرف</Label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="consumption" checked={subType === 'consumption'} onChange={() => handleSubTypeChange('consumption')} />
                                            صرف للاستهلاك
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="sale" checked={subType === 'sale'} onChange={() => handleSubTypeChange('sale')} />
                                            بيع لطالب
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">اختر نوع الصرف المناسب للعملية الحالية</p>
                                </div>
                                <div className="space-y-2"><Label>الكمية</Label><Input type="number" required min={1} value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} /></div>

                                {subType === 'consumption' && (
                                    <div className="space-y-2"><Label>القسم/الجهة (اختياري)</Label><Input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="مثال: المكتبة، الإداري" /></div>
                                )}

                                {subType === 'sale' && (
                                    <div className="space-y-2">
                                        <Label>الطالب</Label>
                                        <Select value={txStudentId} onValueChange={setTxStudentId}>
                                            <SelectTrigger><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                                            <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {txStudentId && (() => {
                                            const selectedStudent = students.find(s => s.id === txStudentId);
                                            const due = selectedStudent ? selectedStudent.totalFees - selectedStudent.paidAmount : 0;
                                            return due > 0 ? (
                                                <Alert className="border-red-200 bg-red-50">
                                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                                    <AlertTitle className="text-red-900">تنبيه: مستحقات</AlertTitle>
                                                    <AlertDescription className="text-red-800 text-sm">
                                                        الطالب عليه مستحقات بقيمة {formatCurrency(due)}. <br/>
                                                        <span className="font-semibold">برجاء التوجه للحسابات للمراجعة قبل إتمام العملية</span>
                                                    </AlertDescription>
                                                </Alert>
                                            ) : null;
                                        })()}
                                        {selectedItemId && items.find(i => i.id === selectedItemId) && (
                                            <p className="text-sm text-muted-foreground">السعر: {formatCurrency(items.find(i => i.id === selectedItemId)?.unitPrice || 0)} × {qty} = {formatCurrency((items.find(i => i.id === selectedItemId)?.unitPrice || 0) * qty)}</p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2"><Label>ملاحظات</Label><Input value={txNote} onChange={(e) => setTxNote(e.target.value)} /></div>
                                <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setIssueDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جاري...' : 'تأكيد الصرف'}</Button></div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Add Item Dialog */}
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={isSubmitting}><Plus className="size-4 ml-2" />صنف جديد</Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">إضافة صنف جديد</DialogTitle></DialogHeader>
                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>اسم الصنف</Label><Input required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /></div>
                                    <div className="space-y-2">
                                        <Label>نوع الصنف</Label>
                                        <Select value={newItem.itemType} onValueChange={(v) => setNewItem({ ...newItem, itemType: v as 'sale' | 'consumable' })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="consumable">استهلاكي</SelectItem>
                                                <SelectItem value="sale">للبيع</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>التصنيف</Label>
                                        <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.key}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label>الوحدة</Label><Input required value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>الكمية المبدئية</Label><Input type="number" required min={0} value={newItem.quantity || ''} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} /></div>
                                    <div className="space-y-2"><Label>الحد الأدنى</Label><Input type="number" required min={0} value={newItem.minQuantity} onChange={(e) => setNewItem({ ...newItem, minQuantity: Number(e.target.value) })} /></div>
                                    <div className="space-y-2"><Label>الحد الأقصى (اختياري)</Label><Input type="number" min={0} value={newItem.maxQuantity || ''} onChange={(e) => setNewItem({ ...newItem, maxQuantity: e.target.value ? Number(e.target.value) : undefined })} /></div>
                                    <div className="space-y-2"><Label>تكلفة الشراء</Label><Input type="number" required min={0} step={0.01} value={newItem.unitCost || ''} onChange={(e) => setNewItem({ ...newItem, unitCost: Number(e.target.value) })} /></div>
                                    {newItem.itemType === 'sale' && (
                                        <div className="space-y-2"><Label>سعر البيع</Label><Input type="number" required min={0} step={0.01} value={newItem.unitPrice || ''} onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })} /></div>
                                    )}
                                    <div className="space-y-2"><Label>الصف (اختياري)</Label><Input value={newItem.grade} onChange={(e) => setNewItem({ ...newItem, grade: e.target.value })} /></div>
                                    <div className="col-span-2 space-y-2"><Label>الوصف (اختياري)</Label><Input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} /></div>
                                </div>
                                <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جاري...' : 'إضافة'}</Button></div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Category Tabs + Table */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex-wrap h-auto gap-1">
                    {categoryTabs.map((c) => (
                        <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-4 rounded-lg border bg-card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-right p-3 font-semibold">الصنف</th>
                                <th className="text-right p-3 font-semibold hidden sm:table-cell">النوع</th>
                                <th className="text-right p-3 font-semibold">الكمية</th>
                                <th className="text-right p-3 font-semibold hidden md:table-cell">الحد الأدنى</th>
                                <th className="text-right p-3 font-semibold hidden lg:table-cell">تكلفة الوحدة</th>
                                <th className="text-right p-3 font-semibold">الحالة</th>
                                <th className="text-center p-3 font-semibold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <Loader2 className="size-10 animate-spin text-primary" />
                                            <p className="font-bold">جاري تحميل بيانات المخزن...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => {
                                    const isLow = item.quantity <= item.minQuantity;
                                    const progressValue = item.maxQuantity ? (item.quantity / item.maxQuantity) * 100 : (item.quantity / (item.minQuantity * 3)) * 100;
                                    return (
                                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="p-3 cursor-pointer" onClick={() => openSheetItem(item)}>
                                                <p className="font-medium text-blue-600 hover:underline">{item.name}</p>
                                                {item.grade && <p className="text-xs text-muted-foreground">{item.grade}</p>}
                                            </td>
                                            <td className="p-3 hidden sm:table-cell">
                                                <Badge variant="secondary" className="text-xs">{item.itemType === 'sale' ? '🛍️ بيعي' : '📦 استهلاكي'}</Badge>
                                            </td>
                                            <td className="p-3">
                                                <div className="space-y-1">
                                                    <p className="font-bold">{item.quantity} {item.unit}</p>
                                                    <Progress value={Math.min(progressValue, 100)} className="h-2" />
                                                </div>
                                            </td>
                                            <td className="p-3 hidden md:table-cell tabular-nums text-muted-foreground">{item.minQuantity}</td>
                                            <td className="p-3 hidden lg:table-cell tabular-nums">{formatCurrency(item.unitCost)}</td>
                                            <td className="p-3">
                                                {isLow ? (
                                                    <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="size-3" />نقص</Badge>
                                                ) : (
                                                    <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">متوفر</Badge>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex gap-1 justify-center flex-wrap">
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} disabled={isSubmitting} title="تعديل" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedItemId(item.id); setReceiveDialogOpen(true); }} disabled={isSubmitting} title="استلام" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                        <ArrowDownToLine className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedItemId(item.id); setIssueDialogOpen(true); }} disabled={isSubmitting} title="صرف" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                                        <ArrowUpFromLine className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openDeleteConfirm(item)} disabled={isSubmitting} title="حذف" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    {!loading && filtered.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="size-12 mx-auto mb-3 opacity-30" />
                            <p>لا يوجد أصناف في هذا التصنيف</p>
                        </div>
                    )}
                </div>
            </Tabs>

            {/* Edit Item Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-[Noto_Kufi_Arabic]">تعديل الصنف</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditItem} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>اسم الصنف</Label><Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                            <div className="space-y-2">
                                <Label>نوع الصنف</Label>
                                <Select value={editForm.itemType} onValueChange={(v) => setEditForm({ ...editForm, itemType: v as 'sale' | 'consumable' })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="consumable">استهلاكي</SelectItem>
                                        <SelectItem value="sale">للبيع</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>التصنيف</Label>
                                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.key}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>الوحدة</Label><Input required value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} /></div>
                            <div className="space-y-2"><Label>الحد الأدنى</Label><Input type="number" required min={0} value={editForm.minQuantity} onChange={(e) => setEditForm({ ...editForm, minQuantity: Number(e.target.value) })} /></div>
                            <div className="space-y-2"><Label>الحد الأقصى (اختياري)</Label><Input type="number" min={0} value={editForm.maxQuantity || ''} onChange={(e) => setEditForm({ ...editForm, maxQuantity: e.target.value ? Number(e.target.value) : undefined })} /></div>
                            <div className="space-y-2"><Label>تكلفة الشراء</Label><Input type="number" required min={0} step={0.01} value={editForm.unitCost || ''} onChange={(e) => setEditForm({ ...editForm, unitCost: Number(e.target.value) })} /></div>
                            {editForm.itemType === 'sale' && (
                                <div className="space-y-2"><Label>سعر البيع</Label><Input type="number" required min={0} step={0.01} value={editForm.unitPrice || ''} onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })} /></div>
                            )}
                            <div className="space-y-2"><Label>الصف (اختياري)</Label><Input value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} /></div>
                            <div className="col-span-2 space-y-2"><Label>الوصف (اختياري)</Label><Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                        </div>
                        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>إلغاء</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'جاري...' : 'حفظ التعديلات'}</Button></div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Sheet - Item Details */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full md:w-[600px] overflow-y-auto">
                    {sheetItem ? (
                        <div className="space-y-6 py-6">
                            <SheetHeader>
                                <SheetTitle className="text-xl">{sheetItem.name}</SheetTitle>
                            </SheetHeader>

                            {/* Item Details Card */}
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">التصنيف</p>
                                        <p className="font-semibold">{categories.find(c => c.key === sheetItem.category)?.name ?? sheetItem.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">النوع</p>
                                        <Badge className="w-fit">{sheetItem.itemType === 'sale' ? '🛍️ للبيع' : '📦 استهلاكي'}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">الوحدة</p>
                                        <p className="font-semibold">{sheetItem.unit}</p>
                                    </div>
                                    {sheetItem.grade && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">الصف</p>
                                            <p className="font-semibold">{sheetItem.grade}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Quantity Indicator */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-muted-foreground">الكمية الحالية</p>
                                        <p className="text-2xl font-bold text-blue-600">{sheetItem.quantity}</p>
                                    </div>
                                    <Progress value={Math.min((sheetItem.quantity / (sheetItem.maxQuantity || sheetItem.minQuantity * 3)) * 100, 100)} className="h-3" />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>الحد الأدنى: {sheetItem.minQuantity}</span>
                                        {sheetItem.maxQuantity && <span>الحد الأقصى: {sheetItem.maxQuantity}</span>}
                                    </div>
                                </div>

                                {/* Prices */}
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">تكلفة الوحدة</p>
                                        <p className="font-semibold text-lg">{formatCurrency(sheetItem.unitCost)}</p>
                                    </div>
                                    {sheetItem.itemType === 'sale' && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">سعر البيع</p>
                                            <p className="font-semibold text-lg text-emerald-600">{formatCurrency(sheetItem.unitPrice)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                {sheetItem.description && (
                                    <div className="border-t pt-4">
                                        <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                                        <p className="text-sm">{sheetItem.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Transactions History */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">آخر الحركات</h3>
                                {sheetTransactions.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">لا توجد حركات لهذا الصنف</p>
                                ) : (
                                    <div className="space-y-2">
                                        {sheetTransactions.map(tx => (
                                            <div key={tx.id} className="border rounded p-3 text-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge className={getSubTypeBadgeColor(tx.subType)}>{getSubTypeLabel(tx.subType)}</Badge>
                                                    <span className="text-muted-foreground">{formatDateShort(tx.date)}</span>
                                                </div>
                                                <p className="font-semibold mb-1">{tx.quantity} {sheetItem.unit} - {formatCurrency(tx.totalAmount)}</p>
                                                {tx.studentName && <p className="text-xs text-muted-foreground">الطالب: {tx.studentName}</p>}
                                                {tx.departmentName && <p className="text-xs text-muted-foreground">الجهة: {tx.departmentName}</p>}
                                                {tx.supplierName && <p className="text-xs text-muted-foreground">المورد: {tx.supplierName}</p>}
                                                {tx.notes && <p className="text-xs text-muted-foreground">ملاحظات: {tx.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </SheetContent>
            </Sheet>

            {/* Delete Confirm Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل تريد حذف "{deletingItem?.name}"؟ سيتم حذف جميع حركات هذا الصنف أيضاً. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                            {isSubmitting ? 'جاري...' : 'حذف'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Recent Transactions */}
            <div className="rounded-lg border bg-card">
                <div className="p-5 border-b flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <h3 className="text-base font-bold font-[Noto_Kufi_Arabic]">آخر حركات المخزن</h3>
                    <div className="flex gap-2 flex-wrap">
                        <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {txTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={txItemFilter} onValueChange={setTxItemFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="جميع الأصناف" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الأصناف</SelectItem>
                                {items.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-right p-3 font-semibold">الصنف</th>
                                <th className="text-right p-3 font-semibold">النوع</th>
                                <th className="text-right p-3 font-semibold">الكمية</th>
                                <th className="text-right p-3 font-semibold hidden sm:table-cell">المبلغ</th>
                                <th className="text-right p-3 font-semibold hidden md:table-cell">الجهة</th>
                                <th className="text-right p-3 font-semibold hidden lg:table-cell">الموظف</th>
                                <th className="text-right p-3 font-semibold hidden xl:table-cell">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-muted-foreground">جاري التحميل...</td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-muted-foreground">لا توجد حركات حتى الآن</td>
                                </tr>
                            ) : (
                                filteredTransactions.slice(0, 20).map((tx) => (
                                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="p-3 font-medium">{tx.item?.name || tx.itemName || 'غير محدد'}</td>
                                        <td className="p-3">
                                            <Badge className={getSubTypeBadgeColor(tx.subType)}>
                                                {getSubTypeLabel(tx.subType)}
                                            </Badge>
                                        </td>
                                        <td className="p-3 tabular-nums font-bold">{tx.quantity} {tx.item?.unit || ''}</td>
                                        <td className="p-3 hidden sm:table-cell tabular-nums">{formatCurrency(tx.totalAmount)}</td>
                                        <td className="p-3 hidden md:table-cell text-muted-foreground text-sm">{tx.studentName || tx.departmentName || tx.supplierName || '—'}</td>
                                        <td className="p-3 hidden lg:table-cell text-muted-foreground text-sm">{tx.performedBy}</td>
                                        <td className="p-3 hidden xl:table-cell text-muted-foreground text-sm">{formatDateShort(tx.date)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Categories Management Dialog */}
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>إدارة التصنيفات</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        {/* Categories Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-4 py-2 text-right">المفتاح</th>
                                        <th className="px-4 py-2 text-right">الاسم</th>
                                        <th className="px-4 py-2 text-right">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((cat) => (
                                        <tr key={cat.id} className="border-t">
                                            <td className="px-4 py-2">{cat.key}</td>
                                            <td className="px-4 py-2">
                                                {editingCat?.id === cat.id ? (
                                                    <Input
                                                        value={editCatName}
                                                        onChange={(e) => setEditCatName(e.target.value)}
                                                        className="text-sm"
                                                    />
                                                ) : (
                                                    cat.name
                                                )}
                                            </td>
                                            <td className="px-4 py-2 flex gap-1">
                                                {editingCat?.id === cat.id ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => handleUpdateCategory(cat.id)}
                                                        >
                                                            حفظ
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setEditingCat(null)}
                                                        >
                                                            إلغاء
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingCat(cat);
                                                                setEditCatName(cat.name);
                                                            }}
                                                        >
                                                            تعديل
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                        >
                                                            حذف
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Add Row */}
                                    <tr className="border-t bg-muted/30">
                                        <td className="px-4 py-2">
                                            <Input
                                                placeholder="مثال: art_supplies"
                                                value={newCatKey}
                                                onChange={(e) => setNewCatKey(e.target.value)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                placeholder="مثال: مستلزمات الفن"
                                                value={newCatName}
                                                onChange={(e) => setNewCatName(e.target.value)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={handleAddCategory}
                                            >
                                                إضافة
                                            </Button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
