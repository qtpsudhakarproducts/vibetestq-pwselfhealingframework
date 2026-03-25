// data/types.ts

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeData {
  firstName:   string;
  lastName:    string;
  employeeId:  string;
  gender:      'Male' | 'Female';
  nationality: string;
  dob:         string;   // OrangeHRM format: yyyy-dd-mm
}

/** Derives the full display name used in OrangeHRM UI lookups. */
export const fullName = (e: EmployeeData): string => `${e.firstName} ${e.lastName}`;

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

export interface HealingConfig {
  enabled:                boolean;
  dryRun:                 boolean;  // log would-heal entries without making LLM calls
  provider:               'anthropic' | 'openai' | 'gemini' | 'ollama-cloud';
  apiKey:                 string;
  model:                  string;
  ollamaHost?:            string;   // only used when provider === 'ollama-cloud'
  maxCalls:               number;
  maxConsecutiveFailures: number;
}

export interface RuntimeConfig {
  env:   {
    baseURL: string;
    workers: number;  // override via PLAYWRIGHT_WORKERS for dedicated environments
  };
  ci:    {
    isCI:  boolean;
    runId?: string;
  };
  healing: HealingConfig;
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
