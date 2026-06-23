export const getGaokaoTarget = (examYear: number) => new Date(examYear, 5, 7, 9, 0, 0, 0);

export const getDefaultExamYear = (today = new Date()) => {
  const examStart = getGaokaoTarget(today.getFullYear());
  return today.getTime() <= examStart.getTime() ? today.getFullYear() : today.getFullYear() + 1;
};

export const getGaokaoCountdown = (examYear: number, now = new Date()) => {
  const target = getGaokaoTarget(examYear).getTime();
  const diff = Math.max(0, target - now.getTime());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes };
};
