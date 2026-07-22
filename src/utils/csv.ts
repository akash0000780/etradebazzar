const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

function escapeCsvField(value: string): string {
    let str = value;

    if (FORMULA_TRIGGER_CHARS.some((char) => str.startsWith(char))) {
        str = `'${str}`;
    }

    const escaped = str.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function toCsv(rows: Record<string, any>[], columns: string[]): string {
    const header = columns.join(",");
    const lines = rows.map((row) =>
        columns
            .map((col) => {
                const val = row[col] ?? "";
                return escapeCsvField(String(val));
            })
            .join(",")
    );
    return [header, ...lines].join("\n");
}