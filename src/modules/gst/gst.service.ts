import { GstFactory } from "../../lib/gst/gst.factory";
import { db } from "../../db/index";
import type { GstDetails } from "../../lib/gst/gst.interface";

function getMockGstDetails(gstin: string): GstDetails {
  return {
    gstin,
    legalName: "Test Business Pvt Ltd",
    tradeName: "Test Business",
    status: "Active",
    address: "123 Test Street, Test City, Test State 000000",
    registrationDate: "01/01/2020",
    businessType: "Private Limited Company",
    raw: { mock: true },
  };
}

export const gstService = {
  async verifyGst(gstin: string) {
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gstin)) {
      throw new Error("Invalid GSTIN format");
    }

    if (process.env.GST_MOCK === "true") {
      return getMockGstDetails(gstin);
    }

    const provider = GstFactory.get();
    return provider.verifyGst(gstin);
  },

  async verifyAndAutofill(sellerId: string, gstin: string) {
    const details = await this.verifyGst(gstin);

    if (details.status.toLowerCase() !== "active") {
      throw new Error(`GST registration is ${details.status}  cannot proceed`);
    }

    await db.sellerKyc.updateMany({
      where: { sellerId },
      data: { gstNumber: gstin },
    });

    return details;
  },
};