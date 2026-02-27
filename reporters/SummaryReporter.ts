// reporters/SummaryReporter.ts
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

interface TestRecord {
  title:    string;
  status:   string;
  duration: number;
  tags:     string[];
  module:   string;
  severity: string;
  type:     string;
}

class SummaryReporter implements Reporter {

  private results:   TestRecord[] = [];
  private startTime: number       = 0;

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  OrangeHRM Automation Suite — Starting');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const tags     = test.tags ?? [];
    const module   = tags.find(t => ['@login', '@pim', '@admin', '@leave'].includes(t)) ?? '@unknown';
    const severity = tags.find(t => ['@critical', '@high', '@medium', '@low'].includes(t)) ?? '';
    const type     = tags.find(t => ['@smoke', '@regression', '@sanity'].includes(t)) ?? '';

    this.results.push({
      title:    test.title,
      status:   result.status,
      duration: result.duration,
      tags,
      module,
      severity,
      type,
    });
  }

  onEnd(result: FullResult): void {
    const totalDuration  = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const passed         = this.results.filter(r => r.status === 'passed').length;
    const failed         = this.results.filter(r => r.status === 'failed').length;
    const flaky          = this.results.filter(r => r.status === 'flaky').length;
    const skipped        = this.results.filter(r => r.status === 'skipped').length;
    const total          = this.results.length;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  TEST RUN SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Status:    ${result.status.toUpperCase()}`);
    console.log(`  Duration:  ${totalDuration}s`);
    console.log(`  Total:     ${total}`);
    console.log(`  ✅ Passed:  ${passed}`);
    console.log(`  ❌ Failed:  ${failed}`);
    if (flaky > 0)   console.log(`  ⚠️  Flaky:   ${flaky}`);
    if (skipped > 0) console.log(`  ⏭  Skipped: ${skipped}`);

    // ─── Results by Module ──────────────────────────────────────────────────────

    console.log('\n─── By Module ────────────────────────────────────────────');
    const modules = ['@login', '@pim', '@admin', '@leave', '@unknown'];
    for (const mod of modules) {
      const moduleTests = this.results.filter(r => r.module === mod);
      if (moduleTests.length === 0) continue;
      const mPassed  = moduleTests.filter(r => r.status === 'passed').length;
      const mFailed  = moduleTests.filter(r => r.status === 'failed').length;
      const modLabel = mod.replace('@', '').toUpperCase().padEnd(8);
      const bar      = mFailed > 0 ? '❌' : '✅';
      console.log(`  ${bar} ${modLabel}  ${mPassed}/${moduleTests.length} passed`);
    }

    // ─── Failed Tests Detail ────────────────────────────────────────────────────

    const failedTests = this.results.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      console.log('\n─── Failed Tests ─────────────────────────────────────────');
      for (const t of failedTests) {
        const sev  = t.severity  ? ` [${t.severity.replace('@', '')}]`  : '';
        const type = t.type      ? ` [${t.type.replace('@', '')}]`      : '';
        console.log(`  ❌ ${t.title}${sev}${type}`);
      }
    }

    // ─── Critical Failures ──────────────────────────────────────────────────────

    const criticalFailures = this.results.filter(
      r => r.status === 'failed' && r.severity === '@critical'
    );
    if (criticalFailures.length > 0) {
      console.log('\n  🚨 CRITICAL FAILURES DETECTED — Core workflows are broken');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

}

export default SummaryReporter;
