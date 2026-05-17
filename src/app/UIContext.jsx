import { createContext, useContext, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [orderForm, setOrderForm] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  // Estado del calendario a nivel de app: al entrar a una orden y volver, se
  // conserva la vista (mes/semana/día) y la fecha de referencia, en vez de
  // saltar siempre al mes actual.
  const [calendarView, setCalendarView] = useState('month');
  const [calendarRefDate, setCalendarRefDate] = useState(() => new Date());

  const value = {
    orderForm,
    dayDetail,
    calendarView,
    setCalendarView,
    calendarRefDate,
    setCalendarRefDate,
    openNewOrderForm: (defaultDate = null, defaults = null, backlogMode = false) => setOrderForm({ defaultDate, defaults, backlogMode }),
    closeOrderForm: () => setOrderForm(null),
    openDayDetail: (date) => setDayDetail(date),
    closeDayDetail: () => setDayDetail(null),
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>');
  return ctx;
}
