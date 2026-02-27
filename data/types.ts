// data/types.ts

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeData {
  firstName:   string;
  lastName:    string;
  fullName:    string;    // computed: `${firstName} ${lastName}`
  employeeId:  string;
  gender:      'Male' | 'Female';
  nationality: string;
  dob:         string;   // OrangeHRM format: yyyy-dd-mm
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserData {
  role:         'Admin' | 'ESS';
  employeeName: string;   // must match an existing employee fullName in OrangeHRM
  status:       'Enabled' | 'Disabled';
  username:     string;
  password:     string;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export interface LeaveData {
  leaveType: string;
  fromDate:  string;   // OrangeHRM format: yyyy-dd-mm
  toDate:    string;   // OrangeHRM format: yyyy-dd-mm
  comment:   string;
}

// ─── Environment Config ───────────────────────────────────────────────────────

export interface EnvConfig {
  baseURL:       string;
  adminUsername: string;
  adminPassword: string;
  essUsername:   string;
  essPassword:   string;
}

// ─── Leave Policy ─────────────────────────────────────────────────────────────

export interface LeavePolicy {
  leaveTypes:           string[];
  maxConsecutiveDays:   number;
  minAdvanceNoticeDays: number;
  allowHalfDay:         boolean;
}

// ─── Password Policy ──────────────────────────────────────────────────────────

export interface PasswordPolicy {
  minLength:        number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber:    boolean;
  requireSpecial:   boolean;
  specialChars:     string;
}
