import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentForm from '@/components/features/StudentForm';

export default function NewAdmission() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/admission')}>
                    <ArrowRight className="size-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-[Noto_Kufi_Arabic]">طلب التحاق جديد</h1>
                    <p className="text-muted-foreground">قم بإدخال بيانات الطالب الجديد والمستندات المطلوبة</p>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <StudentForm onSuccess={() => navigate('/admission')} />
            </div>
        </div>
    );
}
