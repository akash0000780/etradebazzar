import { db } from "../src/db";
import { redis, RedisKeys } from "../src/db/redis";
import {
  assignDefaultRolePermissions,
  seedPlatformPermissions,
} from "../src/lib/permission/permission.service";
import { generateDisplayId } from "../src/lib/uid/uid.generator";
import { logger } from "../src/utils/logger";
import bcrypt from "bcryptjs";

// Helpers
const randomDate = (start: Date, end: Date) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomItem = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
let _c = 0;
const uid = () => `${Date.now()}${++_c}`;

// Static data
const firstNames = [
  "Rahul",
  "Priya",
  "Amit",
  "Sneha",
  "Vikram",
  "Anita",
  "Rajesh",
  "Kavita",
  "Deepak",
  "Meena",
  "Arjun",
  "Nisha",
  "Suresh",
  "Pooja",
  "Kiran",
];
const lastNames = [
  "Sharma",
  "Patel",
  "Singh",
  "Kumar",
  "Verma",
  "Gupta",
  "Reddy",
  "Nair",
  "Iyer",
  "Das",
  "Joshi",
  "Mishra",
  "Tiwari",
  "Yadav",
  "Shah",
];
const cities = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Ahmedabad",
  "Kolkata",
  "Jaipur",
  "Lucknow",
  "Surat",
  "Nagpur",
];
const states = [
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Maharashtra",
  "Gujarat",
  "West Bengal",
  "Rajasthan",
  "Uttar Pradesh",
  "Gujarat",
  "Maharashtra",
];
const roads = [
  "MG Road",
  "Brigade Road",
  "Linking Road",
  "Park Street",
  "Anna Salai",
  "FC Road",
];
const banks = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Bank",
];
const devices = [
  "Android 13 - Chrome",
  "iOS 17 - Safari",
  "Windows 11 - Firefox",
  "macOS - Safari",
];
const comments = [
  "Great product!",
  "Good quality for the price.",
  "Fast delivery, very satisfied.",
  "Exactly as described.",
  "Would buy again.",
  "Exceeded expectations.",
];
const shopNames = ["Flagship", "Express", "Premium", "Online", "Direct"];
const auditActs = [
  "SELLER_APPROVED",
  "PRODUCT_APPROVED",
  "KYC_VERIFIED",
  "ORDER_CREATED",
  "PAYOUT_INITIATED",
  "PRODUCT_REJECTED",
];

const categoryTree = [
  { name: "Electronics", subs: ["Mobiles", "Laptops", "Tech Accessories"] },
  { name: "Fashion", subs: ["Men's Clothing", "Women's Clothing", "Footwear"] },
  { name: "Home & Kitchen", subs: ["Furniture", "Cookware", "Home Decor"] },
  {
    name: "Sports",
    subs: ["Fitness Equipment", "Outdoor Gear", "Team Sports"],
  },
  { name: "Beauty", subs: ["Skincare", "Haircare", "Makeup"] },
  { name: "Books", subs: ["Fiction", "Non-Fiction", "Academic"] },
  { name: "Automotive", subs: ["Car Parts", "Car Accessories", "Auto Tools"] },
  { name: "Health", subs: ["Supplements", "Medical Devices", "Ayurvedic"] },
];

const productNames: Record<string, string[]> = {
  Mobiles: ["iPhone 15", "Samsung Galaxy S24", "OnePlus 12", "Xiaomi 14 Pro"],
  Laptops: [
    "Dell XPS 15",
    "MacBook Pro 14",
    "HP Pavilion 15",
    "Lenovo ThinkPad E15",
  ],
  "Tech Accessories": [
    "USB-C Hub",
    "Wireless Charger",
    "Phone Case",
    "Laptop Stand",
  ],
  "Men's Clothing": [
    "Cotton T-Shirt",
    "Denim Jeans",
    "Formal Shirt",
    "Kurta Pajama",
  ],
  "Women's Clothing": [
    "Designer Kurti",
    "Silk Saree",
    "Casual Dress",
    "Lehenga Choli",
  ],
  Footwear: [
    "Running Shoes",
    "Leather Sandals",
    "Formal Shoes",
    "Canvas Sneakers",
  ],
  Furniture: ["Study Table", "Bookshelf", "Office Chair", "Sofa Set"],
  Cookware: ["Non-Stick Pan", "Pressure Cooker", "Kadai", "Tawa"],
  "Home Decor": ["Wall Clock", "Photo Frame", "Ceramic Vase", "Curtain Set"],
  "Fitness Equipment": [
    "Yoga Mat",
    "Adjustable Dumbbells",
    "Resistance Bands",
    "Jump Rope",
  ],
  "Outdoor Gear": [
    "Camping Tent",
    "Hiking Backpack",
    "Steel Water Bottle",
    "Compass",
  ],
  "Team Sports": ["Cricket Bat", "Football", "Badminton Racket", "Tennis Ball"],
  Skincare: ["Face Cream SPF 30", "Vitamin C Serum", "Face Wash", "Toner Mist"],
  Haircare: [
    "Anti-Dandruff Shampoo",
    "Conditioner",
    "Argan Hair Oil",
    "Dry Shampoo",
  ],
  Makeup: ["Matte Lipstick", "Foundation", "Mascara", "Eyeshadow Palette"],
  Fiction: ["The Alchemist", "Harry Potter Box Set", "1984", "Dune"],
  "Non-Fiction": [
    "Atomic Habits",
    "Sapiens",
    "Rich Dad Poor Dad",
    "Think and Grow Rich",
  ],
  Academic: [
    "Physics Textbook",
    "Chemistry Guide",
    "Maths Workbook",
    "Biology Atlas",
  ],
  "Car Parts": [
    "Car Battery 45Ah",
    "Ceramic Brake Pads",
    "Air Filter",
    "Oil Filter",
  ],
  "Car Accessories": [
    "Seat Covers Set",
    "Steering Wheel Cover",
    "Dash Camera",
    "Car Freshener",
  ],
  "Auto Tools": [
    "Hydraulic Jack",
    "Torque Wrench",
    "Tyre Inflator",
    "OBD2 Scanner",
  ],
  Supplements: [
    "Whey Protein 1kg",
    "Multivitamin Tablets",
    "Omega-3 Capsules",
    "Pre-Workout",
  ],
  "Medical Devices": [
    "BP Monitor Digital",
    "Glucometer",
    "Pulse Oximeter",
    "Infrared Thermometer",
  ],
  Ayurvedic: [
    "Ashwagandha Extract",
    "Triphala Powder",
    "Giloy Tablets",
    "Shilajit Resin",
  ],
};

// Fix Permissions
async function fixSellerPermissions() {
  logger.info("Fixing seller role permissions...");

  const sellers = await db.seller.findMany({
    select: {
      id: true,
      roles: { select: { id: true, name: true } },
    },
  });

  let fixed = 0;
  for (const seller of sellers) {
    const roles = seller.roles.map((r) => ({ id: r.id, name: r.name }));
    if (roles.length === 0) continue;

    const existingPerms = await db.rolePermission.findFirst({
      where: { roleId: { in: roles.map((r) => r.id) } },
    });

    if (existingPerms) continue;

    await db.$transaction(async (tx) => {
      await assignDefaultRolePermissions(tx, roles);
    });

    const members = await db.sellerMember.findMany({
      where: { sellerId: seller.id },
      select: { userId: true },
    });
    for (const member of members) {
      await redis.del(RedisKeys.userPermissions(member.userId, seller.id));
      await redis.del(RedisKeys.userRoles(member.userId, seller.id));
    }

    fixed++;
  }

  logger.info(`Permissions fixed for ${fixed} sellers.`);
}

// Seed
async function seedComprehensive() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_MIGRATE !== "true"
  ) {
    logger.error(
      "Refusing to run seed-comprehensive.ts with NODE_ENV=production without ALLOW_PROD_MIGRATE=true",
    );
    process.exit(1);
  }

  logger.info("Starting comprehensive seed...");
  try {
    // 0. Seed platform permissions
    logger.info("Seeding platform permissions...");
    await db.$transaction(async (tx) => {
      await seedPlatformPermissions(tx);
    });

    // 1. Platform Roles
    logger.info("Seeding platform roles...");
    const [superAdminRole, onboardingRole, reviewerRole] = await Promise.all([
      db.platformRole.upsert({
        where: { name: "super_admin" },
        update: {},
        create: { name: "super_admin", description: "Full platform access" },
      }),
      db.platformRole.upsert({
        where: { name: "onboarding_manager" },
        update: {},
        create: {
          name: "onboarding_manager",
          description: "Manages seller onboarding",
        },
      }),
      db.platformRole.upsert({
        where: { name: "product_reviewer" },
        update: {},
        create: { name: "product_reviewer", description: "Reviews products" },
      }),
    ]);

    // 2. Admin / Platform Users
    logger.info("Seeding admin users...");
    const [adminPwd, onboardPwd, reviewPwd] = await Promise.all([
      bcrypt.hash("Admin@123456", 12),
      bcrypt.hash("Manager@123", 12),
      bcrypt.hash("Reviewer@123", 12),
    ]);
    const adminUser = await db.user.upsert({
      where: { email: "admin@etradebazaar.com" },
      update: {},
      create: {
        name: "Super Admin",
        email: "admin@etradebazaar.com",
        password: adminPwd,
        isActive: true,
      },
    });
    const onboardUser = await db.user.upsert({
      where: { email: "onboarding@etradebazaar.com" },
      update: {},
      create: {
        name: "Onboarding Manager",
        email: "onboarding@etradebazaar.com",
        password: onboardPwd,
        isActive: true,
      },
    });
    const reviewerUser = await db.user.upsert({
      where: { email: "reviewer@etradebazaar.com" },
      update: {},
      create: {
        name: "Product Reviewer",
        email: "reviewer@etradebazaar.com",
        password: reviewPwd,
        isActive: true,
      },
    });
    await Promise.all([
      db.platformMember.upsert({
        where: { userId: adminUser.id },
        update: {},
        create: { userId: adminUser.id, roleId: superAdminRole.id },
      }),
      db.platformMember.upsert({
        where: { userId: onboardUser.id },
        update: {},
        create: { userId: onboardUser.id, roleId: onboardingRole.id },
      }),
      db.platformMember.upsert({
        where: { userId: reviewerUser.id },
        update: {},
        create: { userId: reviewerUser.id, roleId: reviewerRole.id },
      }),
    ]);

    // 3. Platform Configs
    logger.info("Seeding platform configs...");
    await Promise.all(
      [
        ["commission_rate", "5.00"],
        ["min_order_amount", "1000.00"],
        ["max_negotiation_discount", "20.00"],
        ["payout_cycle_days", "7"],
        ["max_return_days", "7"],
        ["low_stock_threshold", "10"],
      ].map(([key, value]) =>
        db.platformConfig.upsert({
          where: { key },
          update: {},
          create: { key, value },
        }),
      ),
    );

    // Idempotency check
    const existingSellers = await db.seller.findFirst();
    if (existingSellers) {
      logger.info(
        "Comprehensive data already exists, skipping data creation...",
      );
      await fixSellerPermissions();
      logger.info("✅ Seed completed (permission fix only)!");
      return;
    }

    // 4. Sellers
    logger.info("Seeding sellers...");
    const sellerPwd = await bcrypt.hash("Seller@123", 12);

    const sellerUser1 = await db.user.upsert({
      where: { email: "akash.seller@example.com" },
      update: {},
      create: {
        name: "Akash Sharma",
        email: "akash.seller@example.com",
        password: sellerPwd,
        isActive: true,
      },
    });
    const seller1 = await db.seller.create({
      data: {
        name: "Akash Sharma",
        email: "akash.seller@example.com",
        phone: "9876543210",
        businessName: "TechPro Solutions",
        businessType: "COMPANY",
        street: "101 MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        status: "APPROVED",
        businessDescription: "Leading technology solutions provider",
        industryCategory: "Electronics",
        yearOfEstablishment: 2018,
        pickupAddress: {
          street: "101 MG Road",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
        },
        billingAddress: {
          street: "101 MG Road",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
        },
        socialLinks: {
          website: "https://techpro.in",
          instagram: "@techpro_india",
        },
      },
    });

    const sellerUser2 = await db.user.upsert({
      where: { email: "priya.seller@example.com" },
      update: {},
      create: {
        name: "Priya Patel",
        email: "priya.seller@example.com",
        password: sellerPwd,
        isActive: true,
      },
    });
    const seller2 = await db.seller.create({
      data: {
        name: "Priya Patel",
        email: "priya.seller@example.com",
        phone: "9876543211",
        businessName: "FashionHive",
        businessType: "INDIVIDUAL",
        street: "22 FC Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        status: "APPROVED",
        businessDescription: "Trendy fashion for all ages",
        industryCategory: "Fashion",
        yearOfEstablishment: 2020,
        pickupAddress: {
          street: "22 FC Road",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
        },
        billingAddress: {
          street: "22 FC Road",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
        },
      },
    });

    const sellerUser3 = await db.user.upsert({
      where: { email: "amit.seller@example.com" },
      update: {},
      create: {
        name: "Amit Singh",
        email: "amit.seller@example.com",
        password: sellerPwd,
        isActive: true,
      },
    });
    const seller3 = await db.seller.create({
      data: {
        name: "Amit Singh",
        email: "amit.seller@example.com",
        phone: "9876543212",
        businessName: "HomeEssentials",
        businessType: "PARTNERSHIP",
        street: "45 Brigade Road",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560001",
        status: "PENDING",
      },
    });

    const allSellers = [seller1, seller2, seller3];
    const allSellerUsers = [sellerUser1, sellerUser2, sellerUser3];

    // Seller roles + members
    const sellerRoles: { owner: any; manager: any; staff: any }[] = [];
    for (let i = 0; i < allSellers.length; i++) {
      const [ownerRole, managerRole, staffRole] = await Promise.all([
        db.sellerRole.create({
          data: {
            sellerId: allSellers[i].id,
            name: "owner",
            description: "Business owner",
          },
        }),
        db.sellerRole.create({
          data: {
            sellerId: allSellers[i].id,
            name: "manager",
            description: "Store manager",
          },
        }),
        db.sellerRole.create({
          data: {
            sellerId: allSellers[i].id,
            name: "staff",
            description: "Staff member",
          },
        }),
      ]);
      sellerRoles.push({
        owner: ownerRole,
        manager: managerRole,
        staff: staffRole,
      });
      await db.$transaction(async (tx) => {
        await assignDefaultRolePermissions(tx, [
          ownerRole,
          managerRole,
          staffRole,
        ]);
      });
      await db.sellerMember.create({
        data: {
          userId: allSellerUsers[i].id,
          sellerId: allSellers[i].id,
          roleId: ownerRole.id,
        },
      });
    }

    // KYC + Bank details + 3 extra team members for approved sellers
    for (let i = 0; i < 2; i++) {
      const seller = allSellers[i];
      await db.sellerKyc.create({
        data: {
          sellerId: seller.id,
          aadharNumber: String(randomInt(200000000000, 999999999999)),
          panNumber: `ABCDE${randomInt(1000, 9999)}F`,
          gstNumber: `27ABCDE${randomInt(1000, 9999)}F1Z5`,
          businessRegNumber: `U${randomInt(10000, 99999)}MH2024PTC${randomInt(100000, 999999)}`,
          status: "VERIFIED",
          verifiedAt: randomDate(new Date("2024-01-01"), new Date()),
          verifiedBy: adminUser.id,
          aadhaarStatus: "VERIFIED",
          govtIdType: "PAN",
          govtIdNumber: `ABCDE${randomInt(1000, 9999)}F`,
          govtIdStatus: "VERIFIED",
        },
      });
      await db.sellerBankDetail.create({
        data: {
          sellerId: seller.id,
          accountHolderName: seller.name,
          accountNumber: encrypt(String(randomInt(100000000000, 999999999999))),
          ifscCode: `SBIN${randomInt(1000000, 9999999)}`,
          bankName: randomItem(banks),
        },
      });
      for (let j = 0; j < 3; j++) {
        const teamUser = await db.user.create({
          data: {
            name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
            email: `team_s${i}_${j}_${uid()}@example.com`,
            password: await bcrypt.hash("Team@123", 12),
            isActive: true,
          },
        });
        await db.sellerMember.create({
          data: {
            userId: teamUser.id,
            sellerId: seller.id,
            roleId:
              j === 0 ? sellerRoles[i].manager.id : sellerRoles[i].staff.id,
          },
        });
      }
    }

    // 5. Seller Invites
    logger.info("Seeding seller invites...");
    for (let i = 0; i < 6; i++) {
      await db.sellerInvite.create({
        data: {
          email: `invite_${uid()}@example.com`,
          sellerId: seller1.id,
          status: randomItem([
            "PENDING",
            "ACCEPTED",
            "EXPIRED",
            "REVOKED",
          ]) as any,
          expiresAt: randomDate(
            new Date(),
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ),
        },
      });
    }

    // 6. Categories
    logger.info("Seeding categories...");
    const categoryMap = new Map<string, string>();
    for (const parentCat of categoryTree) {
      const parent = await db.category.upsert({
        where: { name: parentCat.name },
        update: {},
        create: {
          name: parentCat.name,
          slug: slugify(parentCat.name),
          description: `${parentCat.name} products`,
        },
      });
      categoryMap.set(parentCat.name, parent.id);
      for (const sub of parentCat.subs) {
        const child = await db.category.upsert({
          where: { name: sub },
          update: {},
          create: {
            name: sub,
            slug: slugify(sub),
            description: `${sub} products`,
            parentId: parent.id,
          },
        });
        categoryMap.set(sub, child.id);
      }
    }

    // 7. Shops
    logger.info("Seeding shops...");
    const shops: any[] = [];
    for (const seller of [seller1, seller2]) {
      for (let i = 0; i < 3; i++) {
        const shopName = `${seller.businessName} ${shopNames[i]} Store`;
        const shopDisplayId = await generateDisplayId("shop");
        const shop = await db.shop.create({
          data: {
            sellerId: seller.id,
            displayId: shopDisplayId,
            name: shopName,
            slug: `${slugify(seller.businessName)}-${shopNames[i].toLowerCase()}-${uid()}`,
            description: `${shopName}  quality guaranteed`,
            category: randomItem(categoryTree.map((c) => c.name)),
            contactEmail: seller.email,
            contactPhone: seller.phone,
            returnPolicy: "7-day hassle-free return",
            pickupStreet: seller.street,
            pickupCity: seller.city,
            pickupState: seller.state,
            pickupPincode: seller.pincode,
            latitude: randomDecimal(18.0, 28.0),
            longitude: randomDecimal(72.0, 88.0),
            status: "APPROVED",
            reviewedBy: adminUser.id,
            reviewedAt: randomDate(new Date("2024-01-01"), new Date()),
          },
        });
        shops.push(shop);
      }
    }
    await db.shop.create({
      data: {
        sellerId: seller3.id,
        displayId: await generateDisplayId("shop"),
        name: "HomeEssentials Online",
        slug: `homeessentials-online-${uid()}`,
        description: "Your home essentials destination",
        category: "Home & Kitchen",
        contactEmail: seller3.email,
        contactPhone: seller3.phone,
        returnPolicy: "15-day return",
        pickupStreet: seller3.street,
        pickupCity: seller3.city,
        pickupState: seller3.state,
        pickupPincode: seller3.pincode,
        status: "PENDING",
      },
    });

    // 8. Category-level Commissions
    logger.info("Seeding category commissions...");
    for (const cat of categoryTree) {
      await db.productCommission.create({
        data: {
          category: cat.name,
          rate: randomDecimal(3, 12),
          setBy: adminUser.id,
        },
      });
    }

    // 9. Products
    logger.info("Seeding products...");
    const products: any[] = [];
    let skuCounter = 100000;
    const allSubCats = categoryTree.flatMap((c) => c.subs);
    for (const shop of shops) {
      for (let i = 0; i < 6; i++) {
        const subCat = randomItem(allSubCats);
        const catId =
          categoryMap.get(subCat) ?? categoryMap.get("Electronics")!;
        const names = productNames[subCat] ?? ["Generic Product"];
        const pName = `${randomItem(names)} ${randomItem(["Pro", "Plus", "Elite", "Basic", "Premium"])}`;
        const price = randomDecimal(299, 49999);
        const productDisplayId = await generateDisplayId("product");
        const product = await db.product.create({
          data: {
            shopId: shop.id,
            sellerId: shop.sellerId,
            categoryId: catId,
            displayId: productDisplayId,
            name: pName,
            description: `Premium ${pName}. Manufacturer warranty included.`,
            price,
            compareAtPrice: price * 1.2,
            sku: `SKU-${++skuCounter}`,
            stock: randomInt(20, 500),
            lowStockThreshold: 10,
            weightGrams: randomInt(100, 5000),
            length: randomDecimal(5, 60),
            width: randomDecimal(5, 60),
            height: randomDecimal(2, 30),
            isDigital: false,
            status: "APPROVED",
            reviewedBy: adminUser.id,
            reviewedAt: randomDate(new Date("2024-01-01"), new Date()),
          },
        });
        await Promise.all(
          [1, 2, 3].map((n) =>
            db.productImage.create({
              data: {
                productId: product.id,
                url: `https://picsum.photos/seed/${product.id}${n}/400/400`,
                key: `${product.id}-${n}`,
                order: n - 1,
              },
            }),
          ),
        );
        const colorOpt = await db.variantOption.create({
          data: { productId: product.id, name: "Color" },
        });
        await Promise.all(
          ["Black", "White", "Blue", "Red"].map((v) =>
            db.variantOptionValue.create({
              data: { optionId: colorOpt.id, value: v },
            }),
          ),
        );
        const sizeOpt = await db.variantOption.create({
          data: { productId: product.id, name: "Size" },
        });
        await Promise.all(
          ["S", "M", "L", "XL"].map((v) =>
            db.variantOptionValue.create({
              data: { optionId: sizeOpt.id, value: v },
            }),
          ),
        );
        for (const color of ["Black", "White", "Blue"]) {
          await db.productSKU.create({
            data: {
              productId: product.id,
              sku: `SKU-${++skuCounter}-${color.toUpperCase()}`,
              price,
              stock: randomInt(5, 100),
              minQuantity: 1,
              options: { Color: color, Size: "M" },
            },
          });
        }
        await db.productCommission.create({
          data: {
            productId: product.id,
            rate: randomDecimal(3, 10),
            setBy: adminUser.id,
          },
        });
        products.push(product);
      }
    }

    // 10. Order Thresholds
    logger.info("Seeding order thresholds...");
    for (const seller of [seller1, seller2]) {
      for (const cat of categoryTree) {
        await db.orderThreshold.upsert({
          where: {
            sellerId_productCategory: {
              sellerId: seller.id,
              productCategory: cat.name,
            },
          },
          update: {},
          create: {
            sellerId: seller.id,
            productCategory: cat.name,
            amount: randomDecimal(5000, 50000),
          },
        });
      }
    }

    // 11. Customers
    logger.info("Seeding customers...");
    const customers: any[] = [];
    const custPwd = await bcrypt.hash("Customer@123", 12);
    for (let i = 0; i < 25; i++) {
      const customer = await db.user.create({
        data: {
          name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
          email: `customer${i + 1}@example.com`,
          password: custPwd,
          isActive: true,
        },
      });
      customers.push(customer);
    }

    // 12. Wallets
    logger.info("Seeding wallets...");
    const walletMap = new Map<string, string>();
    for (const user of [...allSellerUsers, ...customers]) {
      const balance = randomDecimal(0, 15000);
      const wallet = await db.wallet.create({
        data: { userId: user.id, balance },
      });
      walletMap.set(user.id, wallet.id);
      if (balance > 0) {
        await db.walletTopup.create({
          data: {
            userId: user.id,
            walletId: wallet.id,
            amount: balance,
            method: randomItem(["NEFT", "RTGS", "IMPS", "UPI"]) as any,
            utrReference: `UTR${randomInt(100000000000, 999999999999)}`,
          },
        });
        await db.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT",
            amount: balance,
            reason: "Initial topup",
            referenceId: wallet.id,
            balanceAfter: balance,
          },
        });
      }
    }

    // 13. Sessions
    logger.info("Seeding sessions...");
    for (const user of [...allSellerUsers, ...customers.slice(0, 10)]) {
      await db.session.create({
        data: {
          userId: user.id,
          deviceInfo: randomItem(devices),
          ipAddress: `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          lastActiveAt: randomDate(new Date("2024-10-01"), new Date()),
          revoked: Math.random() > 0.85,
        },
      });
    }

    // 14. Coupons
    logger.info("Seeding coupons...");
    const coupons: any[] = [];
    for (const c of [
      {
        code: "WELCOME10",
        type: "PERCENTAGE",
        value: 10,
        minOrder: 500,
        maxUses: 100,
      },
      {
        code: "FLAT200",
        type: "FIXED",
        value: 200,
        minOrder: 1000,
        maxUses: 50,
      },
      {
        code: "SALE20",
        type: "PERCENTAGE",
        value: 20,
        minOrder: 2000,
        maxUses: 200,
      },
      {
        code: "BULK500",
        type: "FIXED",
        value: 500,
        minOrder: 5000,
        maxUses: 30,
      },
      {
        code: "FIRST50",
        type: "PERCENTAGE",
        value: 50,
        minOrder: 500,
        maxUses: 1,
      },
    ]) {
      coupons.push(
        await db.coupon.create({
          data: {
            code: c.code,
            type: c.type as any,
            value: c.value,
            minOrder: c.minOrder,
            maxUses: c.maxUses,
            perUserLimit: 1,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            isActive: true,
            scopeType: "ALL",
            scopeIds: [],
            createdBy: adminUser.id,
          },
        }),
      );
    }

    // 15. Orders
    logger.info("Seeding orders...");
    const orders: { order: any; address: any }[] = [];
    const usedPayoutOrders = new Set<string>();
    const usedCouponOrders = new Set<string>();
    const usedReviewCombos = new Set<string>();
    const orderStatuses = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "NEGOTIATING",
    ];

    for (let i = 0; i < 50; i++) {
      const seller = randomItem([seller1, seller2]);
      const customer = randomItem(customers);
      const shopPool = shops.filter((s) => s.sellerId === seller.id);
      const shop = randomItem(shopPool);
      const prodPool = products.filter((p) => p.shopId === shop.id);
      const product =
        prodPool.length > 0 ? randomItem(prodPool) : randomItem(products);
      const qty = randomInt(1, 10);
      const total = parseFloat(product.price.toString()) * qty;
      const commR = 5.0;
      const commA = (total * commR) / 100;
      const oType = randomItem([
        "STANDARD",
        "HIGH_TICKET",
        "SAMPLE",
        "BULK",
      ]) as any;
      const oStatus = randomItem(orderStatuses) as any;
      const payS = randomItem(["UNPAID", "PAID", "PARTIALLY_PAID"]) as any;

      const orderDisplayId = await generateDisplayId("order");
      const order = await db.order.create({
        data: {
          sellerId: seller.id,
          customerId: customer.id,
          displayId: orderDisplayId,
          type: oType,
          status: oStatus,
          totalAmount: total,
          finalAmount: total - commA,
          commissionRate: commR,
          commissionAmount: commA,
          paymentStatus: payS,
          assignedShopId: shop.id,
          discountAmount: Math.random() > 0.7 ? randomDecimal(50, 500) : null,
        },
      });

      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: qty,
          unitPrice: product.price,
          finalUnitPrice: product.price,
          selectedOptions: { Color: randomItem(["Black", "White", "Blue"]) },
        },
      });

      const address = await db.orderAddress.create({
        data: {
          orderId: order.id,
          receiverName: customer.name || "Customer",
          phone: `98${randomInt(10000000, 99999999)}`,
          street: `${randomInt(1, 999)} ${randomItem(roads)}`,
          city: randomItem(cities),
          state: randomItem(states),
          pincode: String(randomInt(110001, 599999)),
          latitude: randomDecimal(18.0, 28.0),
          longitude: randomDecimal(72.0, 88.0),
          assignedShopId: shop.id,
          assignedBy: adminUser.id,
          fulfillmentStatus: randomItem([
            "PENDING",
            "ASSIGNED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
          ]) as any,
        },
      });

      if (oStatus === "SHIPPED" || oStatus === "DELIVERED") {
        await db.shipment.create({
          data: {
            orderId: order.id,
            orderAddressId: address.id,
            shopId: shop.id,
            displayId: await generateDisplayId("shipment"),
            provider: "SHIPROCKET",
            trackingId: `TRK${randomInt(100000000, 999999999)}`,
            trackingUrl: `https://shiprocket.co/tracking/${randomInt(100000000, 999999999)}`,
            status:
              oStatus === "DELIVERED"
                ? "DELIVERED"
                : (randomItem([
                    "BOOKED",
                    "IN_TRANSIT",
                    "OUT_FOR_DELIVERY",
                  ]) as any),
            estimatedDelivery: randomDate(
              new Date(),
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ),
          },
        });
      }

      await db.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: `order_${randomInt(100000000, 999999999)}${i}`,
          razorpayPaymentId:
            payS === "PAID" ? `pay_${randomInt(100000000, 999999999)}` : null,
          amount: total,
          currency: "INR",
          type: randomItem(["ADVANCE", "FINAL"]) as any,
          status: payS,
          attempts: payS === "PAID" ? 1 : 0,
        },
      });

      if (oType === "BULK") {
        await db.bulkUpload.create({
          data: {
            orderId: order.id,
            uploadedBy: seller.id,
            fileName: `bulk_order_${order.id}.csv`,
            status: randomItem(["PROCESSING", "COMPLETED", "FAILED"]) as any,
            totalAddresses: randomInt(10, 100),
            assignedCount: randomInt(5, 50),
          },
        });
      }

      orders.push({ order, address });
    }

    // 16. Negotiations
    logger.info("Seeding negotiations...");
    for (const { order } of orders
      .filter((o) => o.order.status === "NEGOTIATING")
      .slice(0, 8)) {
      await db.orderNegotiation.create({
        data: {
          orderId: order.id,
          proposedBy: order.customerId,
          proposedByType: "customer",
          proposedPrice: parseFloat(order.totalAmount.toString()) * 0.85,
          status: randomItem([
            "PENDING",
            "ACCEPTED",
            "REJECTED",
            "COUNTERED",
          ]) as any,
          note: "Looking for a better deal",
        },
      });
    }
    for (let i = 0; i < 5; i++) {
      const { order } = randomItem(orders);
      await db.orderNegotiation.create({
        data: {
          orderId: order.id,
          proposedBy: order.sellerId,
          proposedByType: "seller",
          proposedPrice: parseFloat(order.totalAmount.toString()) * 0.92,
          status: "COUNTERED",
          note: "Counter offer from seller",
        },
      });
    }

    // 17. Coupon Usages
    logger.info("Seeding coupon usages...");
    for (let i = 0; i < 8; i++) {
      const { order } = orders[i];
      if (usedCouponOrders.has(order.id)) continue;
      await db.couponUsage.create({
        data: {
          couponId: coupons[i % coupons.length].id,
          userId: order.customerId,
          orderId: order.id,
          discount: randomDecimal(50, 500),
        },
      });
      usedCouponOrders.add(order.id);
    }

    // 18. Reviews + Helpful Votes
    logger.info("Seeding reviews...");
    const deliveredOrders = orders.filter(
      (o) => o.order.status === "DELIVERED",
    );
    for (const { order } of deliveredOrders.slice(0, 15)) {
      const items = await db.orderItem.findMany({
        where: { orderId: order.id },
      });
      for (const item of items) {
        const combo = `${order.id}:${item.productId}:${order.customerId}`;
        if (usedReviewCombos.has(combo)) continue;
        usedReviewCombos.add(combo);
        const review = await db.review.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            customerId: order.customerId,
            sellerId: order.sellerId,
            rating: randomInt(3, 5),
            comment: randomItem(comments),
            mediaUrls: [],
            isVerifiedPurchase: true,
            status: randomItem([
              "APPROVED",
              "APPROVED",
              "APPROVED",
              "PENDING",
            ]) as any,
            reviewedBy: Math.random() > 0.4 ? adminUser.id : null,
          },
        });
        const voters = customers.slice(0, randomInt(1, 6));
        const seenVoters = new Set<string>();
        for (const voter of voters) {
          if (seenVoters.has(voter.id)) continue;
          seenVoters.add(voter.id);
          await db.reviewHelpful.create({
            data: { reviewId: review.id, userId: voter.id },
          });
        }
      }
    }

    // 19. Return Requests + Return Shipments
    logger.info("Seeding return requests...");
    for (const { order } of deliveredOrders.slice(0, 8)) {
      const returnReq = await db.returnRequest.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          reason: randomItem([
            "Product damaged",
            "Wrong item received",
            "Not as described",
            "Changed mind",
          ]),
          status: randomItem([
            "PENDING",
            "APPROVED",
            "REJECTED",
            "COMPLETED",
          ]) as any,
          approvedBy: Math.random() > 0.5 ? adminUser.id : null,
          note: "Customer raised return request via portal",
        },
      });
      if (returnReq.status === "APPROVED" || returnReq.status === "COMPLETED") {
        await db.returnShipment.create({
          data: {
            returnRequestId: returnReq.id,
            provider: "SHIPROCKET",
            trackingId: `RTN${randomInt(100000000, 999999999)}`,
            trackingUrl: `https://shiprocket.co/return-tracking/${randomInt(100000000, 999999999)}`,
            status:
              returnReq.status === "COMPLETED"
                ? "DELIVERED"
                : ("IN_TRANSIT" as any),
          },
        });
      }
    }

    // 20. Seller Payouts + Payout Orders
    logger.info("Seeding payouts...");
    for (const seller of [seller1, seller2]) {
      const sellerOrders = orders.filter((o) => o.order.sellerId === seller.id);
      for (let i = 0; i < 3; i++) {
        const gross = randomDecimal(15000, 100000);
        const comm = gross * 0.05;
        const net = gross - comm;
        const status = randomItem([
          "PENDING",
          "PROCESSING",
          "PAID",
          "FAILED",
        ]) as any;
        const payout = await db.sellerPayout.create({
          data: {
            sellerId: seller.id,
            grossAmount: gross,
            commissionAmount: comm,
            netAmount: net,
            method: randomItem(["UPI", "IMPS", "RTGS", "NEFT"]) as any,
            razorpayPayoutId:
              status === "PAID"
                ? `pout_${randomInt(100000000, 999999999)}`
                : null,
            utrReference:
              status === "PAID"
                ? `UTR${randomInt(100000000000, 999999999999)}`
                : null,
            status,
            initiatedBy: adminUser.id,
            paidAt:
              status === "PAID"
                ? randomDate(new Date("2024-06-01"), new Date())
                : null,
            periodStart: randomDate(
              new Date("2024-01-01"),
              new Date("2024-06-01"),
            ),
            periodEnd: randomDate(new Date("2024-06-01"), new Date()),
            note: "Regular weekly payout",
          },
        });
        for (const { order } of sellerOrders.slice(i * 3, i * 3 + 3)) {
          const key = `${payout.id}:${order.id}`;
          if (usedPayoutOrders.has(key)) continue;
          usedPayoutOrders.add(key);
          await db.payoutOrder.create({
            data: {
              payoutId: payout.id,
              orderId: order.id,
              orderAmount: order.totalAmount,
              commissionAmount: order.commissionAmount ?? 0,
              netAmount: order.finalAmount ?? order.totalAmount,
            },
          });
        }
      }
    }

    // 21. Audit Logs
    logger.info("Seeding audit logs...");
    for (let i = 0; i < 30; i++) {
      const seller = randomItem([seller1, seller2]);
      await db.auditLog.create({
        data: {
          sellerId: seller.id,
          actorId: randomItem([adminUser.id, onboardUser.id, reviewerUser.id]),
          actorType: "platform",
          action: randomItem(auditActs),
          entityType: randomItem(["seller", "product", "seller_kyc", "order"]),
          entityId: seller.id,
          metadata: { reason: "Manual review", ts: new Date().toISOString() },
          ipAddress: `10.0.${randomInt(1, 254)}.${randomInt(1, 254)}`,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
    }

    // 22. Notifications
    logger.info("Seeding notifications...");
    const notifDefs = [
      {
        type: "ORDER_PLACED",
        title: "New Order",
        msg: "You have received a new order",
      },
      {
        type: "PAYMENT_RECEIVED",
        title: "Payment",
        msg: "Payment received for your order",
      },
      {
        type: "SELLER_APPROVED",
        title: "Account Approved",
        msg: "Your seller account is approved",
      },
      {
        type: "PRODUCT_APPROVED",
        title: "Product Live",
        msg: "Your product listing is live",
      },
      {
        type: "KYC_VERIFIED",
        title: "KYC Verified",
        msg: "KYC verification complete",
      },
      {
        type: "PAYOUT_PAID",
        title: "Payout Sent",
        msg: "Your payout has been processed",
      },
      {
        type: "SHIPMENT_UPDATED",
        title: "Shipment Update",
        msg: "Shipment status updated",
      },
      {
        type: "RETURN_REQUESTED",
        title: "Return Request",
        msg: "Customer raised a return request",
      },
    ];
    for (const user of [...allSellerUsers, ...customers.slice(0, 15)]) {
      for (let i = 0; i < randomInt(2, 5); i++) {
        const n = randomItem(notifDefs);
        await db.notification.create({
          data: {
            userId: user.id,
            type: n.type as any,
            title: n.title,
            message: n.msg,
            isRead: Math.random() > 0.4,
          },
        });
      }
    }

    // 23. Fix Permissions
    await fixSellerPermissions();

    logger.info("✅ Seed completed!");
    logger.info(
      `  Sellers: ${allSellers.length}  |  Shops: ${shops.length}  |  Products: ${products.length}`,
    );
    logger.info(
      `  Customers: ${customers.length}  |  Orders: ${orders.length}  |  Coupons: ${coupons.length}`,
    );
    logger.info(
      `  DeliveredOrders: ${deliveredOrders.length}  |  Categories: ${categoryMap.size}`,
    );
  } catch (error: any) {
    logger.error({ err: error.message, stack: error.stack }, "Seed failed");
    throw error;
  }
}

seedComprehensive()
  .then(() => {
    logger.info("Seed completed  exiting");
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err: err.message }, "Seed failed  exiting");
    process.exit(1);
  });
