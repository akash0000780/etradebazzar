import { Prisma } from "../../../prisma/generated/client";
import { PERMISSIONS } from "./permission.constants";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    owner: Object.values(PERMISSIONS),
    manager: [
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_UPDATE,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_BULK,
        PERMISSIONS.PRODUCTS_EXPORT,
        PERMISSIONS.PRODUCTS_IMAGES,
        PERMISSIONS.PRODUCTS_VARIANTS,
        PERMISSIONS.SELLER_MEMBERS_VIEW,
        PERMISSIONS.SELLER_MEMBERS_MANAGE,
        PERMISSIONS.SELLER_INVITES_MANAGE,
    ],
    staff: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.SELLER_MEMBERS_VIEW],
};

export async function seedPlatformPermissions(tx: Prisma.TransactionClient) {
    const keys = Object.values(PERMISSIONS);
    await tx.permission.createMany({
        data: keys.map((key) => ({ key })),
        skipDuplicates: true,
    });
}

export async function assignDefaultRolePermissions(
    tx: Prisma.TransactionClient,
    roles: { id: string; name: string }[],
) {
    const allKeys = [...new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat())];

    const permissions = await tx.permission.findMany({
        where: { key: { in: allKeys } },
        select: { id: true, key: true },
    });

    if (permissions.length !== allKeys.length) {
        throw new Error("Permission catalog not seeded — run platform seed first");
    }

    const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

    const rows = roles.flatMap((role) => {
        const keys = DEFAULT_ROLE_PERMISSIONS[role.name] ?? [];
        return keys.map((key) => ({
            roleId: role.id,
            permissionId: permissionIdByKey.get(key)!,
        }));
    });

    if (rows.length) {
        await tx.rolePermission.createMany({ data: rows, skipDuplicates: true });
    }
}