export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatHourlyRate(rate: number): string {
  return `${formatCurrency(rate)}/hr`;
}
