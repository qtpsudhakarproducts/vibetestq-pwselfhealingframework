// helpers/healing/HealingLogger.ts
import * as fs   from 'fs';
import * as path from 'path';

export interface HealEntry {
  description: string;
  original:    string;
  suggested:   string;
  action:      string;
  timestamp:   string;
}

export class HealingLogger {

  private readonly logPath: string;

  constructor(logPath = path.join(process.cwd(), 'healing-log.json')) {
    this.logPath = logPath;
  }

  append(entry: HealEntry): void {
    let log: { heals: HealEntry[] } = { heals: [] };

    if (fs.existsSync(this.logPath)) {
      try {
        log = JSON.parse(fs.readFileSync(this.logPath, 'utf-8'));
      } catch {
        // Corrupted log — start fresh
        log = { heals: [] };
      }
    }

    log.heals.push(entry);
    fs.writeFileSync(this.logPath, JSON.stringify(log, null, 2));
  }

}
