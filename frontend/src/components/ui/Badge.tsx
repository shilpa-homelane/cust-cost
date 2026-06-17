type BadgeVariant = 'calibrated' | 'experimental' | 'draft' | 'final' | 'success' | 'warning' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  calibrated: 'bg-green-50 text-green-700 border border-green-200',
  experimental: 'bg-amber-50 text-amber-700 border border-amber-200',
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  final: 'bg-green-50 text-green-700 border border-green-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  default: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export function Badge({ variant = 'default', children, icon, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
