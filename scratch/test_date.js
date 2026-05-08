
const date = new Date("2026-04-27T00:50:19.000Z");
const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).format(date);
console.log("Input (UTC):", date.toISOString());
console.log("Formatted (SV):", formatted);
