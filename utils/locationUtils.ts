export interface SmartAddressParts {
    houseNumber?: string;
    building?: string;
    street?: string;
    colony?: string;
    mandal?: string;
    district?: string;
    city?: string;
    state?: string;
    pincode?: string;
    fullAddress: string;
}

export const formatSmartAddress = (addr: any): SmartAddressParts => {
    if (!addr) {
        return { fullAddress: '' };
    }

    // Example desired format:
    // 403/4th floor/ RK's Pride/ASR Brundhavan colony/Bachupally/medchal-malkajgiri/Hyderabad/telangana-500090

    const houseNumber = addr.house_number || '';
    const building = addr.building || addr.house_name || '';
    const street = addr.road || addr.street || '';
    const colony = addr.suburb || addr.neighbourhood || addr.city_district || '';

    // Mandal/Tehsil - often subdistrict or county in Nominatim
    const mandal = addr.subdistrict || addr.county || addr.town || addr.village || '';

    // District - state_district is most accurate for India
    const district = addr.state_district || addr.county || '';

    const city = addr.city || addr.town || addr.village || '';
    const state = addr.state || '';
    const pincode = addr.postcode || '';

    // Construct special formatted parts
    const houseBuilding = [houseNumber, building].filter(Boolean).join('/');

    // Build the full parts list
    const parts = [
        houseBuilding,
        street,
        colony,
        mandal,
        district,
        city,
        state ? `${state}-${pincode}` : pincode
    ].filter(part => part && part.length > 0 && part !== '/');

    const fullAddress = parts.join('/');

    return {
        houseNumber,
        building,
        street,
        colony,
        mandal,
        district,
        city,
        state,
        pincode,
        fullAddress
    };
};
