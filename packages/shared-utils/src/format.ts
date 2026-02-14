export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatWeight(weightStr: string): string {
  const weight = parseFloat(weightStr.replace(',', '.'));
  if (isNaN(weight)) return 'N/A';
  return `${weight.toFixed(3)} kg`;
}

export function formatMetalContent(value: string): string {
  const num = parseFloat(value.replace(',', '.'));
  if (isNaN(num) || num === 0) return '-';
  return `${num.toFixed(4)} g/kg`;
}
