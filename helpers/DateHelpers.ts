// helpers/DateHelpers.ts

export class DateHelpers {

  // OrangeHRM uses yyyy-dd-mm date format in form inputs.
  // This helper converts standard JS dates to that format.

  // Formats a Date object to OrangeHRM's expected input format: yyyy-dd-mm
  static toOrangeHRMFormat(date: Date): string {
    const year  = date.getFullYear();
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${day}-${month}`;
  }

  // Returns today's date in OrangeHRM format.
  static today(): string {
    return DateHelpers.toOrangeHRMFormat(new Date());
  }

  // Returns a date N days from today in OrangeHRM format.
  static daysFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return DateHelpers.toOrangeHRMFormat(date);
  }

  // Returns a date N days before today in OrangeHRM format.
  static daysAgo(days: number): string {
    return DateHelpers.daysFromToday(-days);
  }

  // Returns a date N months from today in OrangeHRM format.
  static monthsFromToday(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return DateHelpers.toOrangeHRMFormat(date);
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
    return DateHelpers.toOrangeHRMFormat(date);
  }

}
