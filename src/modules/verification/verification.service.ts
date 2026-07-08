import { db } from "../../db/index";
import { encrypt } from "../../utils/encryption";

export const verificationService = {
  async submitAadhaar(sellerId: string, aadhaarNumber: string) {
    if (!/^\d{12}$/.test(aadhaarNumber))
      throw new Error("Aadhaar number must be 12 digits");

    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found - complete KYC first");

    return db.sellerKyc.update({
      where: { sellerId },
      data: {
        aadharNumber: encrypt(aadhaarNumber),
        aadhaarStatus: "PENDING",
        aadhaarRejectedReason: null,
      },
    });
  },

  async submitGovernmentId(
    sellerId: string,
    data: { govtIdType: string; govtIdNumber: string },
  ) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found  complete KYC first");

    return db.sellerKyc.update({
      where: { sellerId },
      data: {
        govtIdType: data.govtIdType,
        govtIdNumber: encrypt(data.govtIdNumber),
        govtIdStatus: "PENDING",
        govtIdRejectedReason: null,
      },
    });
  },

  async getVerificationStatus(sellerId: string) {
    const kyc = await db.sellerKyc.findUnique({
      where: { sellerId },
      select: {
        status: true,
        aadhaarStatus: true,
        aadhaarRejectedReason: true,
        aadhaarVerifiedAt: true,
        govtIdType: true,
        govtIdStatus: true,
        govtIdRejectedReason: true,
        govtIdVerifiedAt: true,
      },
    });
    if (!kyc) throw new Error("KYC record not found");
    return kyc;
  },

  // Platform admin
  async verifyAadhaar(sellerId: string, actorId: string) {
    return db.sellerKyc.update({
      where: { sellerId },
      data: { aadhaarStatus: "VERIFIED", aadhaarVerifiedAt: new Date() },
    });
  },

  async rejectAadhaar(sellerId: string, reason: string) {
    return db.sellerKyc.update({
      where: { sellerId },
      data: { aadhaarStatus: "REJECTED", aadhaarRejectedReason: reason },
    });
  },

  async verifyGovernmentId(sellerId: string, actorId: string) {
    return db.sellerKyc.update({
      where: { sellerId },
      data: { govtIdStatus: "VERIFIED", govtIdVerifiedAt: new Date() },
    });
  },

  async rejectGovernmentId(sellerId: string, reason: string) {
    return db.sellerKyc.update({
      where: { sellerId },
      data: { govtIdStatus: "REJECTED", govtIdRejectedReason: reason },
    });
  },
};
