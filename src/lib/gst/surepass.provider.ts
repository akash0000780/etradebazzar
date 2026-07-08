import { GstProvider, GstDetails } from "./gst.interface";

const BASE_URL = "https://kyc-api.surepass.io/api/v1";

export class SurepassGstInstance implements GstProvider {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async verifyGst(gstin: string): Promise<GstDetails> {
    const res = await fetch(`${BASE_URL}/corporate/gstin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ id_number: gstin }),
    });

    if (!res.ok)
      throw new Error(
        "GST verification failed  invalid GSTIN or service error",
      );

    const data = (await res.json()) as any;
    const result = data.data;

    return {
      gstin: result.gstin,
      legalName: result.legal_name,
      tradeName: result.trade_name ?? result.legal_name,
      status: result.gstin_status,
      address: result.principal_place_address ?? "",
      registrationDate: result.date_of_registration,
      businessType: result.constitution_of_business,
      raw: result,
    };
  }
}
