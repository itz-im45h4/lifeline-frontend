export const ROLES = {
    ADMIN: 'ADMIN',
    DONOR: 'DONOR',
    HOSPITAL: 'HOSPITAL',
    LAB: 'LAB'
};

export const canViewInventory = (role) => role === ROLES.ADMIN || role === ROLES.LAB;
export const canViewLab = (role) => role === ROLES.ADMIN || role === ROLES.LAB;
export const canApproveAppointments = (role) => role === ROLES.ADMIN || role === ROLES.HOSPITAL;
export const canManageCredentials = (role) => role === ROLES.ADMIN;
export const canCreateHospitalRequest = (role) => role === ROLES.ADMIN || role === ROLES.HOSPITAL;
export const canDispatchHospitalRequest = (role) => role === ROLES.ADMIN || role === ROLES.LAB;
export const canDispatchEmergency = (role) => role === ROLES.ADMIN;
