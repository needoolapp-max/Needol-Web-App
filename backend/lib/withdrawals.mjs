export const MIN_WITHDRAWAL_USDT = 20;
export const DEV_TOTP_CODE = "424242";

export class WithdrawalError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function validateWithdrawalInput({ amountUsdt, trc20Address, totpCode, availableBalance }) {
  const amount = Number(amountUsdt);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WithdrawalError(400, "Withdrawal amount must be a positive number.", "invalid_amount");
  }
  if (amount < MIN_WITHDRAWAL_USDT) {
    throw new WithdrawalError(400, `Minimum withdrawal is ${MIN_WITHDRAWAL_USDT} USDT.`, "minimum_withdrawal");
  }
  if (amount > Number(availableBalance || 0)) {
    throw new WithdrawalError(400, "Withdrawal amount exceeds available balance.", "insufficient_balance");
  }
  const address = String(trc20Address || "").trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{25,40}$/.test(address)) {
    throw new WithdrawalError(400, "Enter a valid TRC20 wallet address.", "invalid_trc20_address");
  }
  if (String(totpCode || "").trim() !== DEV_TOTP_CODE) {
    throw new WithdrawalError(400, "Dev TOTP code is required for withdrawals.", "invalid_totp");
  }
  return {
    amountUsdt: Number(amount.toFixed(2)),
    trc20Address: address,
  };
}

export function validateAdminWithdrawalAction({ withdrawal, action, txHash }) {
  if (!withdrawal) throw new WithdrawalError(404, "Withdrawal not found.", "not_found");
  if (action === "approve") {
    if (withdrawal.status !== "pending") {
      throw new WithdrawalError(400, "Only pending withdrawals can be approved.", "invalid_status");
    }
    return;
  }
  if (action === "reject") {
    if (withdrawal.status !== "pending") {
      throw new WithdrawalError(400, "Only pending withdrawals can be rejected.", "invalid_status");
    }
    return;
  }
  if (action === "mark-paid") {
    if (withdrawal.status !== "approved") {
      throw new WithdrawalError(400, "Only approved withdrawals can be marked paid.", "invalid_status");
    }
    if (!String(txHash || "").trim()) {
      throw new WithdrawalError(400, "txHash is required to mark a withdrawal paid.", "missing_tx_hash");
    }
    return;
  }
  if (action === "fail") {
    if (withdrawal.status !== "approved") {
      throw new WithdrawalError(400, "Only approved withdrawals can be marked failed.", "invalid_status");
    }
    return;
  }
  throw new WithdrawalError(400, "action must be approve|reject|mark-paid|fail.", "invalid_action");
}
