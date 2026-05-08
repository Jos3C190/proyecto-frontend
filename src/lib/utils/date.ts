/**
 * Returns the current date in El Salvador timezone (UTC-6) as a YYYY-MM-DD string.
 * This prevents "off-by-one" day errors when the local time is evening but UTC is already the next day.
 */
export function getElSalvadorDate(): string {
    const now = new Date();
    // Use Intl.DateTimeFormat to get the date in the specific timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(now); // en-CA returns YYYY-MM-DD
}

/**
 * Returns tomorrow's date in El Salvador timezone (UTC-6) as a YYYY-MM-DD string.
 */
export function getElSalvadorTomorrow(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatToElSalvadorDate(tomorrow);
}

/**
 * Returns the date object adjusted to El Salvador timezone.
 */
export function getElSalvadorDateObj(): Date {
    const dateStr = getElSalvadorDate();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Formats a given Date object to YYYY-MM-DD in El Salvador timezone.
 */
export function formatToElSalvadorDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
}
