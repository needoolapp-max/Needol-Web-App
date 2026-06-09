export const ACTIVE_REFERRER_RATE = 0.10;
export const INACTIVE_REFERRER_RATE = 0.02;

export function referralRateForStatus(status) {
  return status === "active" ? ACTIVE_REFERRER_RATE : INACTIVE_REFERRER_RATE;
}

export function commissionAmount({ priceAmount, rate }) {
  const amount = Number(priceAmount || 0);
  const pct = Number(rate || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount * pct).toFixed(2));
}

export function walletTotals({ commissions = [], withdrawals = [] } = {}) {
  const earned = commissions
    .filter((row) => row.status !== "reversed")
    .reduce((sum, row) => sum + Number(row.amount_usdt || 0), 0);
  const withdrawn = withdrawals
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + Number(row.amount_usdt || 0), 0);
  const reserved = withdrawals
    .filter((row) => row.status === "pending" || row.status === "approved")
    .reduce((sum, row) => sum + Number(row.amount_usdt || 0), 0);

  return {
    totalEarned: Number(earned.toFixed(2)),
    totalWithdrawn: Number(withdrawn.toFixed(2)),
    reserved: Number(reserved.toFixed(2)),
    availableBalance: Number(Math.max(earned - withdrawn - reserved, 0).toFixed(2)),
  };
}
