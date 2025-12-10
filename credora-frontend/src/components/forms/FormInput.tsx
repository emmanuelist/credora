import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  isValid?: boolean;
  placeholder?: string;
  suffix?: string;
  helperLeft?: string;
  helperRight?: string;
  onMaxClick?: () => void;
  disabled?: boolean;
  step?: string;
  min?: string;
  max?: string;
}

export function FormInput({
  id,
  label,
  value,
  onChange,
  error,
  isValid,
  placeholder = '0.0',
  suffix = 'sBTC',
  helperLeft,
  helperRight,
  onMaxClick,
  disabled,
  step = '0.0001',
  min = '0',
  max,
}: FormInputProps) {
  const hasValue = value && value.trim() !== '';
  const showSuccess = hasValue && isValid && !error;
  const showError = hasValue && error;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {showSuccess && <CheckCircle className="w-4 h-4 text-success" />}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'pr-24 transition-all duration-200',
            showError && 'border-destructive focus-visible:ring-destructive',
            showSuccess && 'border-success focus-visible:ring-success'
          )}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{suffix}</span>
          {onMaxClick && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs hover:bg-primary/10 hover:text-primary"
              onClick={onMaxClick}
              disabled={disabled}
            >
              MAX
            </Button>
          )}
        </div>
      </div>

      {/* Helper text or error */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          {showError ? (
            <div className="flex items-center gap-1 text-destructive text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : helperLeft ? (
            <span className="text-xs text-muted-foreground">{helperLeft}</span>
          ) : null}
        </div>
        {helperRight && (
          <span className="text-xs text-muted-foreground">{helperRight}</span>
        )}
      </div>
    </div>
  );
}
