export interface AadhaarOtpSession {
  clientId: string;
  raw: unknown;
}

export interface AadhaarDetails {
  aadhaarNumberMasked: string;
  fullName: string;
  dob?: string;
  gender?: string;
  address?: string;
  raw: unknown;
}

export interface AadhaarProvider {
  generateOtp(aadhaarNumber: string): Promise<AadhaarOtpSession>;
  submitOtp(clientId: string, otp: string): Promise<AadhaarDetails>;
}