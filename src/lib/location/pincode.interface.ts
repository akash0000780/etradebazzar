export interface PincodeDetails {
    pincode: string;
    city: string;
    state: string;
    district?: string;
    taluka?: string;
    division?: string;
    region?: string;
    circle?: string;
    deliveryStatus?: string;
    divisionName?: string;
    regionName?: string;
    circleName?: string;
}

export interface PincodeProvider {
    lookupByPincode(pincode: string): Promise<PincodeDetails>;
    lookupByCityState(city: string, state: string): Promise<string[]>;
}