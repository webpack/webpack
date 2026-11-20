export const formatValue = (v) => String(v).toUpperCase();
export const formatLabel = (label, value) => `${label}: ${formatValue(value)}`;
