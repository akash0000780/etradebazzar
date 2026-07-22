export function maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return "****";
    return `${"*".repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}
