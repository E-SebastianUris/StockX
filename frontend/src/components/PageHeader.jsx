export default function PageHeader({
  title,
  description,
  badge = 'Gestión',
  icon,
  children,
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          {icon && (
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-xs shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-200/60 dark:border-blue-900/50">
                {badge}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {children && (
          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

