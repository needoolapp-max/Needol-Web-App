import { insertRow, selectMany, selectOne, updateRows } from "./supabase.mjs";
import { appendUserNotification, findUserById } from "./users.mjs";
import { listCommissionsForUser } from "./referrals-store.mjs";
import { walletTotals } from "./referrals.mjs";
import {
  validateAdminWithdrawalAction,
  validateWithdrawalInput,
} from "./withdrawals.mjs";
import { emitNotification } from "./notifications-store.mjs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function selectWithdrawalFields() {
  return "select=*&order=created_at.desc";
}

function publicUserSummary(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    status: user.status || "inactive",
    accountType: user.account_type,
  };
}

async function decorateWithdrawal(row) {
  if (!row) return null;
  const user = await findUserById(row.user_id);
  return { ...row, user: publicUserSummary(user) };
}

export async function listWithdrawalsForUser(userId) {
  return selectMany(
    "withdrawals",
    `user_id=eq.${encodeURIComponent(userId)}&${selectWithdrawalFields()}`,
  );
}

export async function listWithdrawalsForAdmin({ status, limit = 100 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  if (status) params.set("status", `eq.${status}`);
  params.set("order", "created_at.desc");
  params.set("limit", String(limit));
  const rows = await selectMany("withdrawals", params.toString());
  return Promise.all(rows.map(decorateWithdrawal));
}

export async function getWithdrawalById(id) {
  if (!UUID_RE.test(String(id || ""))) return null;
  return selectOne(
    "withdrawals",
    `id=eq.${encodeURIComponent(id)}&select=*`,
  );
}

export async function countPendingWithdrawals() {
  try {
    const rows = await selectMany("withdrawals", "status=eq.pending&select=id");
    return rows.length;
  } catch (err) {
    if (String(err?.message || "").includes("Could not find the table")) return 0;
    throw err;
  }
}

export async function createWithdrawalRequest({ userId, amountUsdt, trc20Address, totpCode }) {
  const [commissions, withdrawals] = await Promise.all([
    listCommissionsForUser(userId),
    listWithdrawalsForUser(userId),
  ]);
  const totals = walletTotals({ commissions, withdrawals });
  const input = validateWithdrawalInput({
    amountUsdt,
    trc20Address,
    totpCode,
    availableBalance: totals.availableBalance,
  });

  const created = await insertRow(
    "withdrawals",
    {
      user_id: userId,
      amount_usdt: input.amountUsdt,
      trc20_address: input.trc20Address,
      status: "pending",
    },
    { returning: "representation" },
  );

  await appendUserNotification(
    userId,
    `Withdrawal requested: ${input.amountUsdt.toFixed(2)} USDT is pending admin review.`,
  );
  await emitNotification({
    userId,
    eventType: "withdrawal_requested",
    payload: {
      amount: input.amountUsdt,
      withdrawalId: created.id,
      trc20Address: input.trc20Address,
    },
  });

  return created;
}

export async function adminUpdateWithdrawal({ id, adminId, action, txHash, reason }) {
  const withdrawal = await getWithdrawalById(id);
  validateAdminWithdrawalAction({ withdrawal, action, txHash });

  const now = new Date().toISOString();
  const patch = {
    admin_id: adminId || null,
  };

  if (action === "approve") {
    patch.status = "approved";
    patch.approved_at = now;
  } else if (action === "reject") {
    patch.status = "rejected";
    patch.reject_reason = reason ? String(reason) : null;
  } else if (action === "mark-paid") {
    patch.status = "completed";
    patch.tx_hash = String(txHash).trim();
    patch.completed_at = now;
  } else if (action === "fail") {
    patch.status = "failed";
    patch.failure_reason = reason ? String(reason) : null;
  }

  await updateRows("withdrawals", `id=eq.${encodeURIComponent(id)}`, patch);
  const updated = await getWithdrawalById(id);
  if (!updated) {
    throw new Error("Withdrawal update did not return a persisted row.");
  }

  const notificationByAction = {
    approve: `Withdrawal approved: ${Number(updated.amount_usdt || 0).toFixed(2)} USDT is queued for manual payout.`,
    reject: `Withdrawal rejected: ${reason || "No reason provided."}`,
    "mark-paid": `Withdrawal completed: ${Number(updated.amount_usdt || 0).toFixed(2)} USDT sent. Tx: ${String(txHash).trim()}.`,
    fail: `Withdrawal failed: ${reason || "No reason provided."}`,
  };
  await appendUserNotification(updated.user_id, notificationByAction[action]);

  const eventTypeByAction = {
    approve: "withdrawal_approved",
    "mark-paid": "withdrawal_completed",
    fail: "withdrawal_failed",
    reject: "withdrawal_failed",
  };
  if (eventTypeByAction[action]) {
    await emitNotification({
      userId: updated.user_id,
      eventType: eventTypeByAction[action],
      payload: {
        amount: Number(updated.amount_usdt || 0),
        txHash: String(txHash || "").trim() || null,
        reason: reason || null,
        withdrawalId: updated.id,
      },
    });
  }

  return decorateWithdrawal(updated);
}
