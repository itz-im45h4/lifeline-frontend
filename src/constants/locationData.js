export const LOCATION_DATA = {
    'Western Province': ['Colombo District', 'Gampaha District', 'Kalutara District'],
    'Central Province': ['Kandy District', 'Matale District', 'Nuwara Eliya District'],
    'Southern Province': ['Galle District', 'Matara District', 'Hambantota District'],
    'Northern Province': ['Jaffna District', 'Kilinochchi District', 'Mannar District', 'Mullaitivu District', 'Vavuniya District'],
    'Eastern Province': ['Trincomalee District', 'Batticaloa District', 'Ampara District'],
    'North Western Province': ['Kurunegala District', 'Puttalam District'],
    'North Central Province': ['Anuradhapura District', 'Polonnaruwa District'],
    'Uva Province': ['Badulla District', 'Monaragala District'],
    'Sabaragamuwa Province': ['Ratnapura District', 'Kegalle District']
};

export const PROVINCES = Object.keys(LOCATION_DATA);

export const getDistrictsByProvince = (province) => LOCATION_DATA[province] || [];

export const getDefaultLocationSelection = () => {
    const province = PROVINCES[0] || '';
    const district = getDistrictsByProvince(province)[0] || '';
    return { province, district };
};
