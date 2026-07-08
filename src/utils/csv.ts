export function toCsv(rows: Record<string, any>[], columns: string[]): string {
    const header = columns.join(",");
    const lines = rows.map(row =>
        columns.map(col => {
            const val = row[col] ?? "";
            const str = String(val).replace(/"/g, '""');
            return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(",")
    );
    return [header, ...lines].join("\n");
}