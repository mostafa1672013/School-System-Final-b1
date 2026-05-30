import { useState, useMemo } from 'react';
import { Search, Plus, Upload, Image as ImageIcon, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdmissionStore } from '@/stores/admissionStore';
import { useStudentsStore } from '@/stores/studentsStore';
import { stageLabels, trackLabels, gradeOptions, academicYears, currentAcademicYear } from '@/lib/utils';
import type { Stage, Track, Student } from '@/types';

export default function StudentForm({ student, onSuccess }: { student?: Student, onSuccess: () => void }) {
    const { applyAdmission } = useAdmissionStore();
    const { students, updateStudent } = useStudentsStore();
    const [form, setForm] = useState<Partial<Student>>(student || {
        name: '', 
        nationalId: '', 
        stage: 'kg', 
        grade: gradeOptions['kg'][0], 
        track: 'local', 
        academicYear: currentAcademicYear,
        guardianName: '', 
        guardianPhone: '', 
        address: '',
        hasSiblings: false, 
        documents: {},
        extraFields: []
    });

    const [siblingSearch, setSiblingSearch] = useState('');
    const [showSiblingResults, setShowSiblingResults] = useState(false);

    const siblings = useMemo(() => {
        if (!siblingSearch) return [];
        return students.filter(s => 
            (s.name.includes(siblingSearch) || s.nationalId.includes(siblingSearch)) && 
            s.id !== student?.id
        );
    }, [students, siblingSearch, student?.id]);

    const handleSelectSibling = (sibling: Student) => {
        setForm({
            ...form,
            guardianName: sibling.guardianName,
            guardianPhone: sibling.guardianPhone,
            hasSiblings: true
        });
        setSiblingSearch(sibling.name);
        setShowSiblingResults(false);
        toast.info(`تم استيراد بيانات ولي الأمر من الطالب: ${sibling.name}`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string, customLabel?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // Increased to 5MB
            toast.error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'photo') {
                setForm(prev => ({ ...prev, photoUrl: base64String }));
            } else {
                setForm(prev => ({
                    ...prev,
                    documents: {
                        ...(prev.documents as any || {}),
                        [type]: {
                            name: file.name,
                            url: base64String,
                            label: customLabel || getFileLabel(type)
                        }
                    }
                }));
            }
            toast.success(`تم رفع ${customLabel || getFileLabel(type)} بنجاح`);
        };
        reader.readAsDataURL(file);
    };

    const getFileLabel = (type: string) => {
        switch (type) {
            case 'photo': return 'الصورة الشخصية';
            case 'birth_cert': return 'شهادة الميلاد';
            case 'guardian_id': return 'بطاقة ولي الأمر';
            default: return 'المستند';
        }
    };

    const addExtraField = () => {
        const currentFields = (form.extraFields as any[]) || [];
        setForm({ ...form, extraFields: [...currentFields, { label: '', value: '' }] });
    };

    const updateExtraField = (index: number, field: 'label' | 'value', val: string) => {
        const fields = [...(form.extraFields as any[])];
        fields[index][field] = val;
        setForm({ ...form, extraFields: fields });
    };

    const removeExtraField = (index: number) => {
        const fields = (form.extraFields as any[]).filter((_, i) => i !== index);
        setForm({ ...form, extraFields: fields });
    };

    const [customDocLabel, setCustomDocLabel] = useState('');
    const [isAddingDoc, setIsAddingDoc] = useState(false);

    const addCustomDocument = () => {
        if (!customDocLabel.trim()) {
            toast.error('يرجى إدخال مسمى للمستند');
            return;
        }
        const docId = `custom_${Date.now()}`;
        // The input will be triggered by a ref or just show a new uploader
        setIsAddingDoc(false);
        setCustomDocLabel('');
        // We'll just add a placeholder in the UI that triggers handleFileChange with this label
    };

    const [nationalIdError, setNationalIdError] = useState('');
    const [phoneError, setPhoneError] = useState('');

    const validateNationalId = (id: string) => {
        if (!id) {
            setNationalIdError('');
            setForm(prev => ({...prev, birthDate: ''}));
            return false;
        }
        if (!/^\d{14}$/.test(id)) {
            setNationalIdError('الرقم القومي يجب أن يتكون من 14 رقماً');
            setForm(prev => ({...prev, birthDate: ''}));
            return false;
        }

        const century = parseInt(id[0]);
        if (century !== 2 && century !== 3) {
            setNationalIdError('الرقم القومي غير صالح (القرن)');
            setForm(prev => ({...prev, birthDate: ''}));
            return false;
        }

        const yearStr = id.substring(1, 3);
        const monthStr = id.substring(3, 5);
        const dayStr = id.substring(5, 7);

        const year = century === 2 ? 1900 + parseInt(yearStr) : 2000 + parseInt(yearStr);
        const month = parseInt(monthStr);
        const day = parseInt(dayStr);

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            setNationalIdError('الرقم القومي غير صالح (التاريخ)');
            setForm(prev => ({...prev, birthDate: ''}));
            return false;
        }

        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
            setNationalIdError('الرقم القومي غير صالح (تاريخ غير منطقي)');
            setForm(prev => ({...prev, birthDate: ''}));
            return false;
        }

        setNationalIdError('');
        setForm(prev => ({...prev, birthDate: `${year}-${monthStr}-${dayStr}`}));
        return true;
    };

    const validatePhone = (phone: string) => {
        if (!phone) {
            setPhoneError('');
            return false;
        }
        if (!/^01[0125][0-9]{8}$/.test(phone)) {
            setPhoneError('رقم الهاتف غير صالح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً.');
            return false;
        }
        setPhoneError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateNationalId(form.nationalId || '')) {
            toast.error('الرقم القومي غير صالح');
            return;
        }
        
        if (!validatePhone(form.guardianPhone || '')) {
            toast.error('رقم هاتف ولي الأمر غير صالح');
            return;
        }

        try {
            // Clean up empty extra fields
            const cleanedFields = (form.extraFields as any[] || []).filter(f => f.label.trim() && f.value.trim());
            
            // Remove relations and metadata before sending to backend
            const { id, yearlyFinance, payments, createdAt, updatedAt, ...submitData } = form as any;
            const finalForm = { ...submitData, extraFields: cleanedFields };

            if (student?.id) {
                await updateStudent(student.id, finalForm);
                toast.success('تم تحديث البيانات بنجاح');
            } else {
                await applyAdmission(finalForm);
                toast.success('تم تسجيل طلب الالتحاق بنجاح');
            }
            onSuccess();
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || 'حدث خطأ أثناء الحفظ');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>اسم الطالب رباعي</Label>
                    <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                {/* ... (rest of the basic fields) ... */}
                <div className="space-y-2">
                    <Label>الرقم القومي</Label>
                    <Input 
                        required 
                        maxLength={14}
                        className={nationalIdError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        value={form.nationalId} 
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, ''); // Allow numbers only
                            setForm({...form, nationalId: val});
                            if (val.length === 14) validateNationalId(val);
                            else {
                                setNationalIdError('');
                                setForm(prev => ({...prev, birthDate: ''}));
                            }
                        }} 
                        onBlur={e => validateNationalId(e.target.value)}
                    />
                    {nationalIdError && <p className="text-xs text-red-500">{nationalIdError}</p>}
                </div>
                <div className="space-y-2">
                    <Label>تاريخ الميلاد (مستنتج تلقائياً)</Label>
                    <Input 
                        type="date" 
                        disabled 
                        className="bg-muted/50 cursor-not-allowed font-mono" 
                        value={form.birthDate || ''} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>السنة الدراسية</Label>
                    <Select value={form.academicYear} onValueChange={v => setForm({...form, academicYear: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>المرحلة</Label>
                    <Select value={form.stage} onValueChange={v => {
                        const stage = v as Stage;
                        setForm({...form, stage, grade: gradeOptions[stage][0]});
                    }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>الصف</Label>
                    <Select value={form.grade} onValueChange={v => setForm({...form, grade: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {gradeOptions[form.stage!]?.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>المسار</Label>
                    <Select value={form.track} onValueChange={v => setForm({...form, track: v as Track})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.entries(trackLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>له إخوة بالمدرسة؟</Label>
                    <Select value={form.hasSiblings ? 'yes' : 'no'} onValueChange={v => setForm({...form, hasSiblings: v === 'yes'})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yes">نعم</SelectItem>
                            <SelectItem value="no">لا</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {form.hasSiblings && (
                    <div className="space-y-2 relative">
                        <Label>ابحث عن الأخ/الأخت</Label>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث بالاسم أو الرقم القومي..." 
                                value={siblingSearch} 
                                onChange={e => {
                                    setSiblingSearch(e.target.value);
                                    setShowSiblingResults(true);
                                }}
                                className="pr-10"
                            />
                        </div>
                        {showSiblingResults && siblings.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {siblings.map(s => (
                                    <div 
                                        key={s.id} 
                                        className="p-2 hover:bg-muted cursor-pointer text-sm border-b last:border-0"
                                        onClick={() => handleSelectSibling(s)}
                                    >
                                        <p className="font-bold">{s.name}</p>
                                        <p className="text-xs text-muted-foreground">{s.nationalId}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <Label>اسم ولي الأمر</Label>
                    <Input required value={form.guardianName} onChange={e => setForm({...form, guardianName: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>هاتف ولي الأمر</Label>
                    <Input 
                        required 
                        maxLength={11}
                        className={phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        value={form.guardianPhone} 
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setForm({...form, guardianPhone: val});
                            if (val.length === 11) validatePhone(val);
                            else setPhoneError('');
                        }} 
                        onBlur={e => validatePhone(e.target.value)}
                    />
                    {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label>عنوان الطالب بالتفصيل</Label>
                    <Input required placeholder="المحافظة - المركز/المدينة - الشارع - رقم المنزل" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
            </div>

            {/* Custom Fields Section */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <Label className="font-bold text-base">بيانات إضافية مخصصة</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addExtraField}>
                        <Plus className="size-4 ml-2" /> إضافة حقل
                    </Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {(form.extraFields as any[] || []).map((field: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-end bg-muted/30 p-3 rounded-lg border">
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs">مسمى الحقل</Label>
                                <Input placeholder="مثال: الجنسية" value={field.label} onChange={e => updateExtraField(idx, 'label', e.target.value)} />
                            </div>
                            <div className="flex-[2] space-y-2">
                                <Label className="text-xs">القيمة</Label>
                                <Input placeholder="القيمة..." value={field.value} onChange={e => updateExtraField(idx, 'value', e.target.value)} />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeExtraField(idx)}>
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                    {(form.extraFields as any[] || []).length === 0 && (
                        <p className="text-xs text-muted-foreground italic">لا توجد حقول إضافية حالياً</p>
                    )}
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <Label className="font-bold text-base">المستندات المطلوبة</Label>
                    <Dialog open={isAddingDoc} onOpenChange={setIsAddingDoc}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                                <Plus className="size-4 ml-2" /> إضافة مستند مخصص
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>إضافة مستند مخصص</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>مسمى المستند</Label>
                                    <Input placeholder="مثال: شهادة صحية" value={customDocLabel} onChange={e => setCustomDocLabel(e.target.value)} />
                                </div>
                                <Button className="w-full" onClick={() => {
                                    if (customDocLabel) {
                                        // We just need a way to show a new uploader in the grid
                                        setIsAddingDoc(false);
                                    }
                                }}>تأكيد</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Standard Documents */}
                    {/* Personal Photo */}
                    <div className="p-4 border rounded-lg bg-muted/50 flex flex-col items-center gap-2 text-center relative">
                        {form.photoUrl ? (
                            <img src={form.photoUrl} className="size-12 rounded object-cover mb-1 border" />
                        ) : (
                            <ImageIcon className="size-6 text-muted-foreground" />
                        )}
                        <span className="text-xs">صورة شخصية</span>
                        <div className="relative w-full">
                            <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'photo')} />
                            <Button type="button" variant="outline" size="sm" className="w-full mt-2"><Upload className="size-3 ml-1" /> {form.photoUrl ? 'تغيير' : 'رفع'}</Button>
                        </div>
                        {form.photoUrl && <CheckCircle2 className="size-4 text-emerald-500 absolute top-2 left-2" />}
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/50 flex flex-col items-center gap-2 text-center relative">
                        <FileText className="size-6 text-muted-foreground" />
                        <span className="text-xs">شهادة الميلاد</span>
                        <div className="relative w-full">
                            <Input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'birth_cert')} />
                            <Button type="button" variant="outline" size="sm" className="w-full mt-2"><Upload className="size-3 ml-1" /> {(form.documents as any)?.birth_cert ? 'تغيير' : 'رفع'}</Button>
                        </div>
                        {(form.documents as any)?.birth_cert && <CheckCircle2 className="size-4 text-emerald-500 absolute top-2 left-2" />}
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/50 flex flex-col items-center gap-2 text-center relative">
                        <FileText className="size-6 text-muted-foreground" />
                        <span className="text-xs">بطاقة ولي الأمر</span>
                        <div className="relative w-full">
                            <Input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'guardian_id')} />
                            <Button type="button" variant="outline" size="sm" className="w-full mt-2"><Upload className="size-3 ml-1" /> {(form.documents as any)?.guardian_id ? 'تغيير' : 'رفع'}</Button>
                        </div>
                        {(form.documents as any)?.guardian_id && <CheckCircle2 className="size-4 text-emerald-500 absolute top-2 left-2" />}
                    </div>

                    {/* Dynamic Documents */}
                    {Object.entries(form.documents || {}).map(([key, doc]: [string, any]) => {
                        if (['birth_cert', 'guardian_id'].includes(key)) return null;
                        return (
                            <div key={key} className="p-4 border rounded-lg bg-primary/5 border-primary/20 flex flex-col items-center gap-2 text-center relative">
                                <FileText className="size-6 text-primary/60" />
                                <span className="text-xs font-medium">{doc.label || key}</span>
                                <div className="relative w-full">
                                    <Input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, key, doc.label)} />
                                    <Button type="button" variant="outline" size="sm" className="w-full mt-2"><Upload className="size-3 ml-1" /> تغيير</Button>
                                </div>
                                <CheckCircle2 className="size-4 text-emerald-500 absolute top-2 left-2" />
                                <Button type="button" variant="ghost" size="icon" className="size-6 absolute top-1 right-1 text-red-400" onClick={() => {
                                    const docs = { ...form.documents as any };
                                    delete docs[key];
                                    setForm({ ...form, documents: docs });
                                }}>
                                    <Trash2 className="size-3" />
                                </Button>
                            </div>
                        );
                    })}

                    {/* New Doc Slot Placeholder */}
                    {customDocLabel && (
                        <div className="p-4 border border-dashed rounded-lg bg-amber-50/50 flex flex-col items-center gap-2 text-center relative">
                            <Plus className="size-6 text-amber-400" />
                            <span className="text-xs font-bold text-amber-700">{customDocLabel}</span>
                            <div className="relative w-full">
                                <Input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, `custom_${Date.now()}`, customDocLabel)} />
                                <Button type="button" variant="outline" size="sm" className="w-full mt-2 border-amber-200 text-amber-700"><Upload className="size-3 ml-1" /> ارفع الآن</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="submit" className="w-full sm:w-auto font-[Noto_Kufi_Arabic]">
                    {student?.id ? 'حفظ التعديلات' : 'تسجيل الطلب والتوجه للخزينة'}
                </Button>
            </div>
        </form>
    );
}
