
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';
const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'en-PH';
export function fmt(n: number){
  return (n || 0).toLocaleString(LOCALE, { style:'currency', currency: CURRENCY, currencyDisplay:'symbol' });
}
