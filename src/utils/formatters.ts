import { formatDate, isValid, parseISO } from "date-fns";

export const formatCurrency = (value: number): string => {
  return `€${value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const LIGHT_MODE_COLORS = [
    '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c',
    '#0891b2', '#be123c', '#1d4ed8', '#b91c1c', '#047857',
    '#6d28d9', '#c2410c', '#0e7490', '#9f1239', '#1e40af',
    '#991b1b', '#065f46', '#5b21b6', '#9a3412', '#155e75',
    '#881337', '#1e3a8a', '#7f1d1d', '#064e3b', '#4c1d95'
];

const DARK_MODE_COLORS = [
    '#60a5fa', '#f87171', '#34d399', '#a78bfa', '#fb923c',
    '#22d3ee', '#fb7185', '#3b82f6', '#ef4444', '#10b981',
    '#8b5cf6', '#f97316', '#06b6d4', '#f43f5e', '#2563eb',
    '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2',
    '#be123c', '#1d4ed8', '#b91c1c', '#047857', '#6d28d9'
];

export const getHexColor = (usedColors: Set<string>, isDarkMode: boolean): string => {
    const colorPool = isDarkMode ? DARK_MODE_COLORS : LIGHT_MODE_COLORS;

    // Find first unused color
    const availableColor = colorPool.find(color => !usedColors.has(color));

    if (availableColor) {
        return availableColor;
    }

    // Fallback to random color if all predefined colors are used
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
};

export const formatDateToISO = (date: Date) => formatDate(date, 'yyyy-MM-dd');
export const isValidDate = (dateString: string) => isValid(parseISO(dateString));
