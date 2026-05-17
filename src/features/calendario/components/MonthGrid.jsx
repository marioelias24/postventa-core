import { fmt } from '@/shared/lib/dates';

export function MonthGrid({ refDate, ordersByDay, today, onSelectDate, cardOrder }) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
          <div key={d} className="px-3 py-2 text-xs font-semibold text-stone-500 text-center uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="min-h-[130px] border-r border-b border-stone-100 bg-stone-50/40" />;
          const key = fmt(date);
          const dayOrders = ordersByDay[key] || [];
          const isToday = key === today;
          return (
            <div key={idx} className={`min-h-[130px] border-r border-b border-stone-100 p-1.5 hover:bg-stone-50 transition-colors ${isToday ? 'bg-teal-50' : ''}`}>
              <button onClick={() => onSelectDate(date)} className={`block text-xs font-semibold mb-1 px-1 ${isToday ? 'text-teal-700' : 'text-stone-500'} hover:text-stone-900`}>
                {date.getDate()}
              </button>
              <div className="space-y-1">
                {dayOrders.slice(0, 3).map(o => cardOrder(o))}
                {dayOrders.length > 3 && (
                  <button onClick={() => onSelectDate(date)} className="w-full text-left text-[11px] text-stone-500 hover:text-stone-800 px-1 font-medium">
                    +{dayOrders.length - 3} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
