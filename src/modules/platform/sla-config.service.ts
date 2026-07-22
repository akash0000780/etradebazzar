import { db } from "../../db";

const DEFAULTS = {
    packing_sla_hours: "24",
    dispatch_upload_sla_hours: "24",
    sla_breach_penalty_points: "5",
}

const SLA_CONFIG_KEYS = Object.keys(DEFAULTS);


export const slaConfigService = {
    async getSlaConfig(): Promise<Record<string, number>> {
        const rows = await db.platformConfig.findMany({
            where: {
                key: { in: SLA_CONFIG_KEYS }
            },
        });

        const map = new Map(rows.map((r) => [r.key, r.value]));

        const result: Record<string, number> = {};
        for (const key of SLA_CONFIG_KEYS) {
            result[key] = Number(map.get(key) ?? DEFAULTS[key as keyof typeof DEFAULTS]);
        }
        return result;
    },
    async updateSlaConfig(
        data: Partial<{ packing_sla_hours: number; dispatch_upload_sla_hours: number; sla_breach_penalty_points: number }>,
        actorId: string,
    ) {
        const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [string, number][];

        for (const [key, value] of entries) {
            if (!SLA_CONFIG_KEYS.includes(key)) continue;
            if (!Number.isFinite(value) || value <= 0) {
                throw new Error(`${key} must be a positive number`);
            }
            await db.platformConfig.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            });
        }

        await db.auditLog.create({
            data: {
                actorId,
                actorType: "platform",
                action: "SLA_CONFIG_UPDATED",
                entityType: "platform_config",
                entityId: "sla",
                metadata: data,
            },
        });

        return this.getSlaConfig();
    },
}