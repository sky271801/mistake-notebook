export const toDateKey = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (source: Date, days: number) => {
  const date = new Date(source);
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const isDue = (isoDate: string) => {
  return new Date(isoDate).getTime() <= endOfToday().getTime();
};

export const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

export const formatShortDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};
