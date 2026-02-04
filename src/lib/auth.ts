const EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN;

export const employeeCodeToEmail = (code: string): string => {
    if (!code) return "";
    const cleanCode = code.trim().toLowerCase();
    return `${cleanCode}@${EMAIL_DOMAIN}`;
};
