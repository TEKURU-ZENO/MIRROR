import { describe, it, expect } from 'vitest';
import {
  calculateROI,
  DEFAULT_ROI_PARAMETERS,
  INDUSTRY_ROI_PRESETS,
  formatUSD,
} from './roiCalculator';

describe('ROI & Efficiency Calculator', () => {
  it('calculates baseline default utility ROI with positive return and turnaround acceleration', () => {
    const roi = calculateROI();

    expect(roi.parameters.annualInspections).toBe(DEFAULT_ROI_PARAMETERS.annualInspections);
    expect(roi.totalAnnualHoursSaved).toBeGreaterThan(1000);
    expect(roi.annualLaborSavingsUSD).toBeGreaterThan(150_000);
    expect(roi.turnaroundAccelerationRatio).toBeGreaterThan(5); // e.g., 6.3x
    expect(roi.annualPreemptedOutageSavingsUSD).toBe(250_000);
    expect(roi.netAnnualBenefitUSD).toBeGreaterThan(300_000);
    expect(roi.roiPercentage).toBeGreaterThan(500); // > 500% ROI
    expect(roi.paybackPeriodMonths).toBeLessThan(3); // Under 3 months payback
  });

  it('calculates custom parameters for regional power cooperative correctly', () => {
    const preset = INDUSTRY_ROI_PRESETS['regional-power-coop'];
    const roi = calculateROI(preset);

    expect(roi.parameters.annualInspections).toBe(400);
    expect(roi.parameters.inspectorHourlyRate).toBe(75);
    expect(roi.parameters.peHourlyRate).toBe(150);
    expect(roi.grossAnnualEconomicBenefitUSD).toBeGreaterThan(150_000);
    expect(roi.netAnnualBenefitUSD).toBe(roi.grossAnnualEconomicBenefitUSD - (preset.annualSubscriptionFeeUSD ?? 36000));
  });

  it('formats USD values accurately in compact and expanded forms', () => {
    expect(formatUSD(1_500_000, true)).toBe('$1.50M');
    expect(formatUSD(48_000, true)).toBe('$48k');
    expect(formatUSD(500, true)).toBe('$500');
    expect(formatUSD(12500, false)).toContain('12,500');
  });
});
