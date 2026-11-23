// MIRROR — Commercial ROI & Efficiency Calculator
// Calculates operational hours saved, labor cost avoidance, turnaround acceleration,
// and catastrophic outage preemption for utility & civil infrastructure operators.

export interface ROIParameters {
  annualInspections: number;
  inspectorHourlyRate: number;      // e.g., $85/hr (Field Tech)
  peHourlyRate: number;             // e.g., $165/hr (Licensed Professional Engineer)
  avgManualDraftHours: number;      // Baseline manual report compilation: 3.5 hrs
  avgMirrorDraftHours: number;      // MIRROR hybrid automated drafting: 0.3 hrs (18 mins)
  avgManualReviewHours: number;     // Baseline PE review & verification: 1.5 hrs
  avgMirrorReviewHours: number;     // MIRROR citation-grounded PE review: 0.5 hrs (30 mins)
  avoidedCatastrophicOutagesPerYear: number; // Cascading fault preemption (e.g., 0.15 events/yr)
  avgOutageCost: number;            // Average cost of catastrophic transformer/substation fire: $1,250,000
  annualSubscriptionFeeUSD: number; // Annual SaaS platform license cost
}

export interface ROIEstimate {
  parameters: ROIParameters;
  annualFieldHoursSaved: number;
  annualPEHoursSaved: number;
  totalAnnualHoursSaved: number;
  annualLaborSavingsUSD: number;
  turnaroundAccelerationRatio: number;
  annualPreemptedOutageSavingsUSD: number;
  grossAnnualEconomicBenefitUSD: number;
  netAnnualBenefitUSD: number;
  roiPercentage: number;
  paybackPeriodMonths: number;
}

export const DEFAULT_ROI_PARAMETERS: ROIParameters = {
  annualInspections: 650,
  inspectorHourlyRate: 85,
  peHourlyRate: 165,
  avgManualDraftHours: 3.5,
  avgMirrorDraftHours: 0.3,
  avgManualReviewHours: 1.5,
  avgMirrorReviewHours: 0.5,
  avoidedCatastrophicOutagesPerYear: 0.20,
  avgOutageCost: 1_250_000,
  annualSubscriptionFeeUSD: 48_000,
};

export const INDUSTRY_ROI_PRESETS: Record<string, Partial<ROIParameters>> = {
  'metro-electric-grid': {
    annualInspections: 1200,
    inspectorHourlyRate: 95,
    peHourlyRate: 180,
    avoidedCatastrophicOutagesPerYear: 0.35,
    avgOutageCost: 2_000_000,
    annualSubscriptionFeeUSD: 72_000,
  },
  'regional-power-coop': {
    annualInspections: 400,
    inspectorHourlyRate: 75,
    peHourlyRate: 150,
    avoidedCatastrophicOutagesPerYear: 0.10,
    avgOutageCost: 850_000,
    annualSubscriptionFeeUSD: 36_000,
  },
  'bridge-transit-authority': {
    annualInspections: 250,
    inspectorHourlyRate: 90,
    peHourlyRate: 175,
    avgManualDraftHours: 5.0,
    avgMirrorDraftHours: 0.5,
    avoidedCatastrophicOutagesPerYear: 0.05,
    avgOutageCost: 5_000_000,
    annualSubscriptionFeeUSD: 32_000,
  },
};

/**
 * Calculates quantitative return on investment (ROI) for utility operations using MIRROR.
 */
export function calculateROI(overrides: Partial<ROIParameters> = {}): ROIEstimate {
  const p: ROIParameters = { ...DEFAULT_ROI_PARAMETERS, ...overrides };

  // 1. Time Savings
  const draftHoursSavedPerInspection = Math.max(0, p.avgManualDraftHours - p.avgMirrorDraftHours);
  const reviewHoursSavedPerInspection = Math.max(0, p.avgManualReviewHours - p.avgMirrorReviewHours);

  const annualFieldHoursSaved = Math.round(p.annualInspections * draftHoursSavedPerInspection);
  const annualPEHoursSaved = Math.round(p.annualInspections * reviewHoursSavedPerInspection);
  const totalAnnualHoursSaved = annualFieldHoursSaved + annualPEHoursSaved;

  // 2. Direct Labor Savings
  const fieldLaborSavings = annualFieldHoursSaved * p.inspectorHourlyRate;
  const peLaborSavings = annualPEHoursSaved * p.peHourlyRate;
  const annualLaborSavingsUSD = Math.round(fieldLaborSavings + peLaborSavings);

  // 3. Turnaround Acceleration
  const baselineTotalTime = p.avgManualDraftHours + p.avgManualReviewHours;
  const mirrorTotalTime = p.avgMirrorDraftHours + p.avgMirrorReviewHours;
  const turnaroundAccelerationRatio = mirrorTotalTime > 0
    ? Number((baselineTotalTime / mirrorTotalTime).toFixed(1))
    : 1;

  // 4. Preempted Outage Avoidance (Risk-Weighted)
  const annualPreemptedOutageSavingsUSD = Math.round(
    p.avoidedCatastrophicOutagesPerYear * p.avgOutageCost
  );

  // 5. Net Economic Benefit & Payback
  const grossAnnualEconomicBenefitUSD = annualLaborSavingsUSD + annualPreemptedOutageSavingsUSD;
  const netAnnualBenefitUSD = grossAnnualEconomicBenefitUSD - p.annualSubscriptionFeeUSD;

  const roiPercentage = p.annualSubscriptionFeeUSD > 0
    ? Math.round((netAnnualBenefitUSD / p.annualSubscriptionFeeUSD) * 100)
    : 0;

  const monthlyGrossBenefit = grossAnnualEconomicBenefitUSD / 12;
  const paybackPeriodMonths = monthlyGrossBenefit > 0
    ? Number((p.annualSubscriptionFeeUSD / monthlyGrossBenefit).toFixed(1))
    : 0;

  return {
    parameters: p,
    annualFieldHoursSaved,
    annualPEHoursSaved,
    totalAnnualHoursSaved,
    annualLaborSavingsUSD,
    turnaroundAccelerationRatio,
    annualPreemptedOutageSavingsUSD,
    grossAnnualEconomicBenefitUSD,
    netAnnualBenefitUSD,
    roiPercentage,
    paybackPeriodMonths,
  };
}

/**
 * Formats a currency number in standard USD compact or full representation.
 */
export function formatUSD(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}k`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
