import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface TransactionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  details: Array<{ label: string; value: string; highlight?: boolean }>;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function TransactionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  onConfirm,
  isLoading = false,
  confirmLabel = 'Confirm Transaction',
  cancelLabel = 'Cancel',
}: TransactionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {details.map((detail, index) => (
              <div key={index}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{detail.label}</span>
                  <span className={`font-mono font-semibold ${detail.highlight ? 'text-primary text-lg' : ''}`}>
                    {detail.value}
                  </span>
                </div>
                {index < details.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning-foreground">
              ⚠️ Please review the details carefully before confirming. This transaction will be recorded on the blockchain.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="min-w-[140px]"
            style={{ background: isLoading ? undefined : 'var(--gradient-primary)' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
