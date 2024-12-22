export const formatCurrency = (value: number): string => {
  return `€${value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};
