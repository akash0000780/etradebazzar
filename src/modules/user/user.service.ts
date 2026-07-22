import { db } from "../../db/index";

export const userService = {
  async listUsers(filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.status === "active") where.isActive = true;
    if (filters.status === "inactive") where.isActive = false;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          platformMember: {
            select: { role: { select: { name: true } } },
          },
          sellerMemberships: {
            select: { seller: { select: { id: true, name: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    const data = users.map((u) => {
      let role = "user";
      if (u.platformMember) {
        role = u.platformMember.role.name;
      } else if (u.sellerMemberships.length > 0) {
        role = "seller";
      }
      return {
        id: u.id,
        name: u.name || "",
        email: u.email,
        role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  },
};
