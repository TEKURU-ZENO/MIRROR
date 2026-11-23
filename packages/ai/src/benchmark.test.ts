import { describe, it, expect } from 'vitest';
import { runBenchmarkSuite, getStandardBenchmarkScenarios } from './benchmark.js';

describe('Infrastructure Intelligence Benchmark & Evaluation Harness', () => {
  it('provides standardized infrastructure incident benchmark scenarios', () => {
    const scenarios = getStandardBenchmarkScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
    expect(scenarios[0].id).toBe('SCENARIO-1');
    expect(scenarios[0].groundTruth.expectedTopPriorityAssetId).toBe('SUB-METRO');
  });

  it('runBenchmarkSuite executes all scenarios and achieves 100% concordance against ground truth', async () => {
    const result = await runBenchmarkSuite();

    expect(result.totalScenarios).toBe(2);
    expect(result.passedScenarios).toBe(2);
    expect(result.compositeScore).toBe(100);

    for (const scenario of result.scenarios) {
      expect(scenario.passed).toBe(true);
      expect(scenario.metrics.triageConcordance).toBe(true);
      expect(scenario.metrics.citationIntegrityScore).toBe(1.0);
      expect(scenario.metrics.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
