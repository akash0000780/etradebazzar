import { db } from "../../db/index";
import { AadhaarFactory } from "../../lib/aadhar/aadhar.factory";
import { PanFactory } from "../../lib/pan/pan.factory";
import { encrypt } from "../../utils/encryption";

export const verificationService = {
  async requestAadhaarOtp(sellerId: string, aadhaarNumber: string) {
    if (!/^\d{12}$/.test(aadhaarNumber))
      throw new Error("Aadhaar number must be 12 digits");

    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found - complete KYC first");

    if (kyc.aadhaarStatus === "VERIFIED") {
      throw new Error("Aadhaar already verified, contact support to change it");
    }

    const provider = AadhaarFactory.get();
    const session = await provider.generateOtp(aadhaarNumber);

    await db.sellerKyc.update({
      where: { sellerId },
      data: {
        aadharNumber: encrypt(aadhaarNumber, sellerId),
        aadhaarStatus: "PENDING",
        aadhaarRejectedReason: null,
        aadhaarOtpClientId: session.clientId,
      },
    });

    return { otpSent: true };
  },

  async confirmAadhaarOtp(sellerId: string, otp: string) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found complete KYC first");
    if (!kyc.aadhaarOtpClientId) {
      throw new Error("No pending Aadhaar OTP request request an OTP first");
    }

    const provider = AadhaarFactory.get();
    const details = await provider.submitOtp(kyc.aadhaarOtpClientId, otp);

    return db.$transaction(async (tx) => {
      const updated = await tx.sellerKyc.update({
        where: { sellerId },
        data: {
          aadhaarStatus: "VERIFIED",
          aadhaarVerifiedAt: new Date(),
          aadhaarOtpClientId: null,
          aadhaarVerifiedName: details.fullName || null,
          aadhaarVerificationMeta: details.raw as any,
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId, actorId: sellerId, actorType: "system",
          action: "AADHAAR_VERIFIED", entityType: "seller_kyc", entityId: sellerId,
          metadata: { via: "surepass_otp", verifiedName: details.fullName },
        },
      });

      return updated;
    });
  },

  async submitGovernmentId(
    sellerId: string,
    data: { govtIdType: string; govtIdNumber: string },
  ) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found  complete KYC first");

    if (kyc.govtIdStatus === "VERIFIED") {
      throw new Error("Government ID already verified, contact support to change it");
    }

    if (data.govtIdType === "PAN") {
      return this.submitPan(sellerId, data.govtIdNumber);
    }

    return db.sellerKyc.update({
      where: { sellerId },
      data: {
        govtIdType: data.govtIdType,
        govtIdNumber: encrypt(data.govtIdNumber, sellerId),
        govtIdStatus: "PENDING",
        govtIdRejectedReason: null,
        govtIdVerifiedName: null,
        govtIdVerificationMeta: undefined,
      },
    });
  },

  async submitPan(sellerId: string, panNumber: string) {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
      throw new Error("PAN number format is invalid");
    }

    const provider = PanFactory.get();
    const details = await provider.verifyPan(panNumber);

    const isValid = details.status === "VALID";

    return db.$transaction(async (tx) => {
      const updated = await tx.sellerKyc.update({
        where: { sellerId },
        data: {
          govtIdType: "PAN",
          govtIdNumber: encrypt(panNumber, sellerId),
          govtIdStatus: isValid ? "VERIFIED" : "REJECTED",
          govtIdRejectedReason: isValid ? null : "PAN could not be verified against government records",
          govtIdVerifiedAt: isValid ? new Date() : null,
          govtIdVerifiedName: details.fullName || null,
          govtIdVerificationMeta: details.raw as any,
        },
      });

      await tx.auditLog.create({
        data: {
          sellerId, actorId: sellerId, actorType: "system",
          action: isValid ? "GOVT_ID_VERIFIED" : "GOVT_ID_REJECTED",
          entityType: "seller_kyc", entityId: sellerId,
          metadata: { via: "surepass_pan", status: details.status, verifiedName: details.fullName },
        },
      });

      return updated;
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
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found");
    if (kyc.aadhaarStatus !== "PENDING") {
      throw new Error(`Cannot verify current status is ${kyc.aadhaarStatus}`);
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.sellerKyc.update({
        where: { sellerId },
        data: { aadhaarStatus: "VERIFIED", aadhaarVerifiedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          sellerId, actorId, actorType: "platform",
          action: "AADHAAR_VERIFIED", entityType: "seller_kyc", entityId: sellerId,
        },
      });

      return updated;
    });
  },

  async rejectAadhaar(sellerId: string, actorId: string, reason: string) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found");
    if (kyc.aadhaarStatus === "PENDING" || kyc.aadhaarStatus === "VERIFIED") {
    } else {
      throw new Error(`Cannot reject current status is ${kyc.aadhaarStatus}`);
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.sellerKyc.update({
        where: { sellerId },
        data: { aadhaarStatus: "REJECTED", aadhaarRejectedReason: reason },
      });

      await tx.auditLog.create({
        data: {
          sellerId, actorId, actorType: "platform",
          action: "AADHAAR_REJECTED", entityType: "seller_kyc", entityId: sellerId,
          metadata: { reason },
        },
      });

      return updated;
    });
  },

  async verifyGovernmentId(sellerId: string, actorId: string) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found");
    if (kyc.govtIdStatus !== "PENDING") {
      throw new Error(`Cannot verify current status is ${kyc.govtIdStatus}`);
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.sellerKyc.update({
        where: { sellerId },
        data: { govtIdStatus: "VERIFIED", govtIdVerifiedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          sellerId, actorId, actorType: "platform",
          action: "GOVT_ID_VERIFIED", entityType: "seller_kyc", entityId: sellerId,
        },
      });

      return updated;
    });
  },

  async rejectGovernmentId(sellerId: string, actorId: string, reason: string) {
    const kyc = await db.sellerKyc.findUnique({ where: { sellerId } });
    if (!kyc) throw new Error("KYC record not found");
    if (kyc.govtIdStatus === "PENDING" || kyc.govtIdStatus === "VERIFIED") {
    } else {
      throw new Error(`Cannot reject current status is ${kyc.govtIdStatus}`);
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.sellerKyc.update({
        where: { sellerId },
        data: { govtIdStatus: "REJECTED", govtIdRejectedReason: reason },
      });

      await tx.auditLog.create({
        data: {
          sellerId, actorId, actorType: "platform",
          action: "GOVT_ID_REJECTED", entityType: "seller_kyc", entityId: sellerId,
          metadata: { reason },
        },
      });

      return updated;
    });
  },
};
