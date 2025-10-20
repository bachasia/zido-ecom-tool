export const fmtMoney = (value: string | number, currency?: string) =>
  (value ?? '') === '' ? '—' : `${Number(value).toFixed(2)}${currency ? ' ' + currency : ''}`;

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : '—';
