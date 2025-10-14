interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
}

export function StatCard({ label, value, subValue, icon }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
        </div>
        {icon && (
          <div className="text-3xl opacity-20">{icon}</div>
        )}
      </div>
    </div>
  );
}
