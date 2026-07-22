const HONORIFIC_PREFIXES = new Set(["MR", "MRS", "MS", "MISS", "DR", "SHRI", "SMT", "M/S", "MESSRS"]);

function normalizeName(name: string): string {
    const normalized = name
        .toUpperCase()
        .replace(/[.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return normalized
        .split(" ")
        .filter((token) => !HONORIFIC_PREFIXES.has(token))
        .join(" ");
}

function levenshteinDistance(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let i = 0; i < rows; i++) matrix[i]![0] = i;
    for (let j = 0; j < cols; j++) matrix[0]![j] = j;

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i]![j] = Math.min(
                matrix[i - 1]![j]! + 1,
                matrix[i]![j - 1]! + 1,
                matrix[i - 1]![j - 1]! + cost,
            );
        }
    }

    return matrix[rows - 1]![cols - 1]!;
}

export const NAME_MATCH_THRESHOLD = 0.82;


export function computeNameMatchScore(submittedName: string, bankRegisteredName: string): number {
    const a = normalizeName(submittedName);
    const b = normalizeName(bankRegisteredName);

    if (!a || !b) return 0;
    if (a === b) return 1;

    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : Math.max(0, 1 - distance / maxLength);
}

export function isNameMatch(submittedName: string, bankRegisteredName: string): boolean {
    return computeNameMatchScore(submittedName, bankRegisteredName) >= NAME_MATCH_THRESHOLD;
}
