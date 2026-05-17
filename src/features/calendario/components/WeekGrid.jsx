import { fmt } from '@/shared/lib/dates';

export function WeekGrid({ refDate, ordersByDay, today, onSelectDate, cardOrder }) {
  const start = new Date(refDate); start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
        {days.map((d, i) => {
          const key = fmt(d);
          const isToday = key === today;
          return (
            <button key={i} onClick={() => onSelectDate(d)} className={`px-2 py-2.5 text-center border-r border-stone-200 last:border-r-0 hover:bg-stone-100 ${isToday ? 'bg-teal-50' : ''}`}>
              <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">{dayNames[i].slice(0, 3)}</div>
              <div className={`text-lg font-bold ${isToday ? 'text-teal-700' : 'text-stone-800'}`}>{d.getDate()}</div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((d, i) => {
          const key = fmt(d);
          const dayOrders = ordersByDay[key] || [];
          const isToday = key === today;
          return (
            <div key={i} className={`p-1.5 border-r border-stone-100 last:border-r-0 space-y-1 ${isToday ? 'bg-teal-50/40' : ''}`}>
              {dayOrders.length === 0 && <div className="text-[10px] text-stone-300 text-center py-4">—</div>}
              {dayOrders.map(o => cardOrder(o))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
