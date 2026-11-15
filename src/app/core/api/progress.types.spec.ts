import {
  escalationGateLabel,
  escalationPrimaryPath,
} from './progress.types';

describe('progress escalation helpers', () => {
  it('maps primary CTA from highest-severity gate', () => {
    expect(escalationPrimaryPath(['REPEATED_RED'])).toBe('/deep-dive');
    expect(escalationPrimaryPath(['UNRESOLVED_MISTAKE_CLUSTER'])).toBe(
      '/mistakes',
    );
    expect(escalationPrimaryPath(['REPEATED_QUESTION_MISS'])).toBe('/mistakes');
    expect(escalationPrimaryPath(['THIN_MCQ_COVERAGE'])).toBeNull();
  });

  it('labels gates for display', () => {
    expect(escalationGateLabel('REPEATED_RED')).toContain('Repeated red');
    expect(escalationGateLabel('THIN_MCQ_COVERAGE')).toContain('Thin MCQ');
  });
});
