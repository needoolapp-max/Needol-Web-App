import assert from "node:assert/strict";
import test from "node:test";
import {
  commissionAmount,
  referralRateForStatus,
  walletTotals,
} from "../lib/referrals.mjs";
import {
  validateAdminWithdrawalAction,
  validateWithdrawalInput,
  WithdrawalError,
} from "../lib/withdrawals.mjs";

const address = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";

test("referral rates, commissions, and wallet totals follow PRD rules", () => {
  assert.equal(referralRateForStatus("active"), 0.1);
  assert.equal(referralRateForStatus("inactive"), 0.02);
  assert.equal(commissionAmount({ priceAmount: 5, rate: 0.1 }), 0.5);
  assert.deepEqual(
    walletTotals({
      commissions: [{ amount_usdt: 25, status: "earned" }, { amount_usdt: 5, status: "reversed" }],
      withdrawals: [{ amount_usdt: 20, status: "completed" }, { amount_usdt: 2, status: "approved" }],
    }),
    { totalEarned: 25, totalWithdrawn: 20, reserved: 2, availableBalance: 3 },
  );
});

test("withdrawal input validates amount, balance, address, and dev TOTP", () => {
  assert.deepEqual(
    validateWithdrawalInput({ amountUsdt: 20, trc20Address: address, totpCode: "424242", availableBalance: 25 }),
    { amountUsdt: 20, trc20Address: address },
  );
  assert.throws(
    () => validateWithdrawalInput({ amountUsdt: 19.99, trc20Address: address, totpCode: "424242", availableBalance: 25 }),
    (error) => error instanceof WithdrawalError && error.code === "minimum_withdrawal",
  );
  assert.throws(
    () => validateWithdrawalInput({ amountUsdt: 20, trc20Address: "bad", totpCode: "424242", availableBalance: 25 }),
    (error) => error instanceof WithdrawalError && error.code === "invalid_trc20_address",
  );
  assert.throws(
    () => validateWithdrawalInput({ amountUsdt: 20, trc20Address: address, totpCode: "000000", availableBalance: 25 }),
    (error) => error instanceof WithdrawalError && error.code === "invalid_totp",
  );
});

test("admin withdrawal transitions reject invalid states", () => {
  assert.doesNotThrow(() => validateAdminWithdrawalAction({ withdrawal: { status: "pending" }, action: "approve" }));
  assert.doesNotThrow(() => validateAdminWithdrawalAction({ withdrawal: { status: "approved" }, action: "mark-paid", txHash: "0xabc" }));
  assert.throws(
    () => validateAdminWithdrawalAction({ withdrawal: { status: "pending" }, action: "mark-paid", txHash: "0xabc" }),
    (error) => error instanceof WithdrawalError && error.code === "invalid_status",
  );
});
