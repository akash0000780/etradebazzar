import { db } from "../../db/index";

export const walletService = {
    async getOrCreateWallet(userId: string) {
        let wallet = await db.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await db.wallet.create({ data: { userId } });
        }
        return wallet;
    },

    async getBalance(userId: string) {
        const wallet = await this.getOrCreateWallet(userId);
        return { balance: Number(wallet.balance) };
    },

    async credit(userId: string, amount: number, reason: string, referenceId?: string) {
        if (amount <= 0) throw new Error("Credit amount must be positive");

        return db.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) wallet = await tx.wallet.create({ data: { userId } });

            const updated = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } },
            });

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "CREDIT",
                    amount,
                    reason,
                    referenceId,
                    balanceAfter: updated.balance,
                },
            });

            return updated;
        });
    },

    async debit(userId: string, amount: number, reason: string, referenceId?: string) {
        if (amount <= 0) throw new Error("Debit amount must be positive");

        return db.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new Error("Wallet not found");
            if (Number(wallet.balance) < amount) throw new Error("Insufficient credits");

            const updated = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "DEBIT",
                    amount,
                    reason,
                    referenceId,
                    balanceAfter: updated.balance,
                },
            });

            return updated;
        });
    },

    async topup(
        userId: string,
        data: { amount: number; method: "NEFT" | "RTGS" | "UPI" | "IMPS"; utrReference: string }
    ) {
        if (data.amount <= 0) throw new Error("Top-up amount must be positive");

        const wallet = await this.getOrCreateWallet(userId);

        return db.$transaction(async (tx) => {
            const topup = await tx.walletTopup.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    amount: data.amount,
                    method: data.method,
                    utrReference: data.utrReference,
                },
            });

            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: data.amount } },
            });

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "CREDIT",
                    amount: data.amount,
                    reason: "TOPUP",
                    referenceId: topup.id,
                    balanceAfter: updatedWallet.balance,
                },
            });

            return { topup, wallet: updatedWallet };
        });
    },

    async getTransactions(userId: string, page = 1, limit = 20) {
        const wallet = await this.getOrCreateWallet(userId);

        const [transactions, total] = await Promise.all([
            db.walletTransaction.findMany({
                where: { walletId: wallet.id },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db.walletTransaction.count({ where: { walletId: wallet.id } }),
        ]);

        return { transactions, total, page, limit, balance: Number(wallet.balance) };
    },

    async getTopupHistory(userId: string) {
        return db.walletTopup.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    },
};