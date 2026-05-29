import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
  pageSizeOptions?: number[];
}

/**
 * RTL-aware pagination footer for server-paginated tables.
 * Shows the current range, page X of Y, page-size selector, and first/prev/next/last.
 * In RTL, "next" advances the page while the chevron visually points left.
 */
export default function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  pageSizeOptions = [25, 50, 100],
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canPrev = page > 1 && !isLoading;
  const canNext = page < safeTotalPages && !isLoading;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-sm">
      <div className="text-muted-foreground tabular-nums">
        عرض {from.toLocaleString('ar-EG')}–{to.toLocaleString('ar-EG')} من {total.toLocaleString('ar-EG')}
      </div>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs hidden sm:inline">لكل صفحة</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="text-muted-foreground tabular-nums whitespace-nowrap">
          صفحة {page.toLocaleString('ar-EG')} من {safeTotalPages.toLocaleString('ar-EG')}
        </span>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => onPageChange(1)} disabled={!canPrev} title="الصفحة الأولى">
            <ChevronsRight className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => onPageChange(page - 1)} disabled={!canPrev} title="السابق">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => onPageChange(page + 1)} disabled={!canNext} title="التالي">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => onPageChange(safeTotalPages)} disabled={!canNext} title="الصفحة الأخيرة">
            <ChevronsLeft className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
