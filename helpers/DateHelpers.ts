// helpers/DateHelpers.ts

export class DateHelpers {

  // OrangeHRM date input format: yyyy-dd-mm
  // Note: this is NOT the standard ISO format (yyyy-mm-dd)
  // The day and month are swapped compared to what most developers expect
  private static readonly ORANGEHRM_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

  // ─── Formatting ───────────────────────────────────────────────────────────────

  // Converts a JavaScript Date object to OrangeHRM's expected input format.
  // OrangeHRM expects yyyy-dd-mm — day and month are in reversed order
  // compared to standard ISO 8601 (yyyy-mm-dd).
  //
  // Usage:
  //   DateHelpers.formatToOrangeHRM(new Date('2025-01-15'));
  //   → '2025-15-01'
  static formatToOrangeHRM(date: Date): string {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${day}-${month}`;
  }

  // Alias for backwards compatibility with existing code using toOrangeHRMFormat()
  static toOrangeHRMFormat(date: Date): string {
    return DateHelpers.formatToOrangeHRM(date);
  }

  // Parses an ISO date string (yyyy-mm-dd) and returns OrangeHRM format (yyyy-dd-mm).
  // This is the most common conversion needed — test data is typically written
  // in ISO format for readability, but must be converted before being sent to a field.
  //
  // Usage:
  //   DateHelpers.fromISO('2025-01-15');
  //   → '2025-15-01'
  static fromISO(isoDateString: string): string {
    const [year, month, day] = isoDateString.split('-');
    if (!year || !month || !day) {
      throw new Error(
        `DateHelpers.fromISO: "${isoDateString}" is not a valid ISO date string. ` +
        `Expected format: yyyy-mm-dd.`
      );
    }
    return `${year}-${day}-${month}`;
  }

  // ─── Validation ───────────────────────────────────────────────────────────────

  // Returns true if the string is in OrangeHRM's expected date format (yyyy-dd-mm).
  // Use this as a guard before passing a date string to fillDateInput().
  //
  // Usage:
  //   DateHelpers.isValidOrangeHRMDate('2025-15-01'); → true
  //   DateHelpers.isValidOrangeHRMDate('2025-01-15'); → false (ISO format — will fail)
  static isValidOrangeHRMDate(dateString: string): boolean {
    if (!DateHelpers.ORANGEHRM_FORMAT.test(dateString)) return false;

    const [year, day, month] = dateString.split('-').map(Number);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31)     return false;

    // Validate day against month — catches impossible dates like 2025-31-02
    const maxDays = new Date(year, month, 0).getDate();
    return day <= maxDays;
  }

  // ─── Relative Dates ───────────────────────────────────────────────────────────

  // Returns today's date in OrangeHRM format.
  static today(): string {
    return DateHelpers.formatToOrangeHRM(new Date());
  }

  // Returns a date N days from today in OrangeHRM format.
  static daysFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return DateHelpers.formatToOrangeHRM(date);
  }

  // Returns a date N days before today in OrangeHRM format.
  static daysAgo(days: number): string {
    return DateHelpers.daysFromToday(-days);
  }

  // Returns a date N months from today in OrangeHRM format.
  static monthsFromToday(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return DateHelpers.formatToOrangeHRM(date);
  }

  // Returns a date suitable for a leave request that starts tomorrow
  // and ends the day after (2 working day leave, always in the future).
  static leaveStartDate(): string {
    return DateHelpers.daysFromToday(1);
  }

  static leaveEndDate(): string {
    return DateHelpers.daysFromToday(2);
  }

  // Converts a date string from yyyy-dd-mm back to a JS Date object.
  static fromOrangeHRMFormat(dateString: string): Date {
    const [year, day, month] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Returns a date of birth that is a valid adult age (25-50 years ago).
  static randomAdultDOB(): string {
    const yearsAgo = 25 + Math.floor(Math.random() * 25);
    const date     = new Date();
    date.setFullYear(date.getFullYear() - yearsAgo);
    return DateHelpers.formatToOrangeHRM(date);
  }

}
