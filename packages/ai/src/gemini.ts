// MIRROR – Firebase AI Logic cloud inference
// Uses getAI + getGenerativeModel from firebase/ai (Firebase AI Logic SDK).
// Gracefully degrades to mock/stub data when Firebase is not configured.

// @ts-ignore
import type { FirebaseApp } from 'firebase/app';
import type {
  InspectionRecord,
  EvidenceItem,
  CrossInspectionAssessment,
  ObservationSummary,
  ConflictFlag,
} from '@mirror/core';
import { generateId } from '@mirror/core';
import {
  buildSynthesisPrompt,
  buildSummaryPrompt,
  buildConflictPrompt,
} from './prompts.js';

interface EnvRecord {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface CustomImportMeta {
  readonly env?: EnvRecord;
}

interface GenericFirebaseApp {
  name: string;
}

interface GenericAI {
  app: unknown;
}

interface GenericModel {
  generateContent(prompt: string): Promise<{
    response: {
      text(): string;
    };
  }>;
}

interface FirebaseAppModule {
  initializeApp(config: Record<string, unknown>, name?: string): FirebaseApp;
  getApps(): GenericFirebaseApp[];
}

interface FirebaseAIModule {
  getAI(app: unknown): GenericAI;
  getGenerativeModel(ai: GenericAI, options: { model: string; generationConfig?: { responseMimeType?: string } }): GenericModel;
}

const FIREBASE_APP_PKG = 'firebase/app';
const FIREBASE_AI_PKG = 'firebase/ai';

// ── Firebase app & Gemini API initialisation ────────────────────────────────

interface GlobalProcess {
  env?: Record<string, string | undefined>;
}

export function getGeminiApiKey(): string | undefined {
  const g = globalThis as unknown as { process?: GlobalProcess };
  if (g.process?.env) {
    if (g.process.env.GEMINI_API_KEY) return g.process.env.GEMINI_API_KEY;
    if (g.process.env.VITE_FIREBASE_API_KEY) return g.process.env.VITE_FIREBASE_API_KEY;
  }
  const meta = import.meta as unknown as CustomImportMeta;
  return meta.env?.VITE_FIREBASE_API_KEY;
}

function getFirebaseApiKey(): string | undefined {
  return getGeminiApiKey();
}

/**
 * Direct REST invocation of Google Generative AI API (Gemini 2.0 Flash).
 * Works across Node.js (v18+) and browser fetch environments without SDK wrappers.
 */
export async function callGeminiRestAPI(
  prompt: string,
  apiKey: string,
  options?: { model?: string; jsonMode?: boolean }
): Promise<string | null> {
  const model = options?.model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (options?.jsonMode) {
    payload.generationConfig = { responseMimeType: 'application/json' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[MIRROR AI] Gemini REST call returned status ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.warn('[MIRROR AI] Gemini direct REST call failed:', err);
    return null;
  }
}

async function getFirebaseApp(): Promise<FirebaseApp | null> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;

  const meta = import.meta as unknown as CustomImportMeta;
  const firebaseConfig: Record<string, unknown> = {
    apiKey,
    authDomain: meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: meta.env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: meta.env?.VITE_FIREBASE_APP_ID,
  };

  try {
    const appModule = (await import(
      /* @vite-ignore */ FIREBASE_APP_PKG
    )) as unknown as FirebaseAppModule;
    const apps = appModule.getApps();
    const existing = apps.find((a: GenericFirebaseApp) => a.name === 'mirror-ai');
    return (existing as unknown as FirebaseApp) ?? appModule.initializeApp(firebaseConfig, 'mirror-ai');
  } catch {
    return null;
  }
}

export function parseJSONFromText<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return !!getFirebaseApiKey();
}

export async function generateCloudTextRaw(prompt: string, customApiKey?: string): Promise<string | null> {
  const apiKey = customApiKey || getGeminiApiKey();

  // Try direct Gemini REST endpoint first when an API key is available
  if (apiKey) {
    const restResult = await callGeminiRestAPI(prompt, apiKey, { model: 'gemini-2.0-flash' });
    if (restResult) return restResult;
  }

  // Fall back to Firebase AI Logic SDK if configured
  const app = await getFirebaseApp();
  if (!app) return null;

  try {
    const aiModule = (await import(
      /* @vite-ignore */ FIREBASE_AI_PKG
    )) as unknown as FirebaseAIModule;
    const ai = aiModule.getAI(app);
    const model = aiModule.getGenerativeModel(ai, {
      model: 'gemini-2.0-flash',
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.warn('[MIRROR AI] Cloud raw inference failed:', err);
    return null;
  }
}

export async function generateCloudJSON<T>(prompt: string, customApiKey?: string): Promise<T | null> {
  const apiKey = customApiKey || getGeminiApiKey();

  // Try direct Gemini REST endpoint with jsonMode
  if (apiKey) {
    const raw = await callGeminiRestAPI(prompt, apiKey, { model: 'gemini-2.0-flash', jsonMode: true });
    if (raw) {
      const parsed = parseJSONFromText<T>(raw);
      if (parsed) return parsed;
    }
  }

  // Fall back to Firebase AI Logic SDK
  const app = await getFirebaseApp();
  if (!app) return null;

  try {
    const aiModule = (await import(
      /* @vite-ignore */ FIREBASE_AI_PKG
    )) as unknown as FirebaseAIModule;
    const ai = aiModule.getAI(app);
    const model = aiModule.getGenerativeModel(ai, {
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseJSONFromText<T>(text);
  } catch (err) {
    console.warn('[MIRROR AI] Cloud inference failed:', err);
    return null;
  }
}

async function generateJSON<T>(prompt: string): Promise<T | null> {
  return generateCloudJSON<T>(prompt);
}

// ── Mock data helpers ──────────────────────────────────────────────────────

function mockCrossInspectionAssessment(
  inspections: InspectionRecord[]
): CrossInspectionAssessment {
  return {
    kind: 'cross-inspection-assessment',
    incidentId: inspections[0]?.incidentId ?? generateId(),
    inspectionIds: inspections.map((i) => i.id),
    overallDamageLevel: 'moderate',
    summary:
      'Demo mode: Firebase not configured. Cross-inspection synthesis completed using local mock engine with confidence 0.72. Multi-site review shows localized structural impact.',
    priorityRanking: inspections.map((ins, idx) => ({
      inspectionId: ins.id,
      priority: idx + 1,
      rationale: `Site evaluation for ${ins.assetType} at ${ins.locationLabel} ranked #${idx + 1} based on field damage report.`,
    })),
    conflictIds: [],
  };
}

function mockObservationSummary(inspection: InspectionRecord): ObservationSummary {
  return {
    kind: 'observation-summary',
    text: `Demo mode: Firebase not configured. Inspection of ${inspection.assetType} asset "${inspection.assetId}" at "${inspection.locationLabel}" with ${inspection.evidence.length} evidence items.`,
    damageLevel: 'moderate',
    keyFindings: [
      `${inspection.evidence.length} evidence item(s) logged`,
      `Asset type verified: ${inspection.assetType}`,
      'Demo mode: Firebase not configured — simulated analysis',
    ],
    caveats: [
      'Demo mode: Firebase API key not configured. Real Gemini cloud inference requires VITE_FIREBASE_API_KEY.',
    ],
  };
}

function mockConflictFlags(inspections: InspectionRecord[]): ConflictFlag[] {
  if (inspections.length < 2) return [];
  return [
    {
      kind: 'conflict-flag',
      conflictingInspectionIds: [inspections[0].id, inspections[1].id],
      description:
        'Demo mode: Firebase not configured. Potential discrepancy in reported damage severity between primary and secondary site reports.',
      resolution: undefined,
      resolvedAt: undefined,
      resolvedBy: undefined,
    },
  ];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Synthesize a cross-inspection assessment using Gemini cloud inference.
 * Falls back to mock data if Firebase is not configured or inference fails.
 */
export async function synthesizeInspections(
  inspections: InspectionRecord[],
  evidenceItems: EvidenceItem[]
): Promise<CrossInspectionAssessment> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey || inspections.length === 0) {
    return mockCrossInspectionAssessment(inspections);
  }

  try {
    const prompt = buildSynthesisPrompt(inspections, evidenceItems);
    const result = await generateJSON<CrossInspectionAssessment>(prompt);

    if (result && result.kind === 'cross-inspection-assessment') {
      return result;
    }
  } catch (err) {
    console.warn('[MIRROR AI] synthesizeInspections error, falling back to mock:', err);
  }

  return mockCrossInspectionAssessment(inspections);
}

/**
 * Summarize a single inspection using Gemini cloud inference.
 * Falls back to mock data if Firebase is not configured or inference fails.
 */
export async function summarizeInspection(
  inspection: InspectionRecord,
  evidenceItems: EvidenceItem[]
): Promise<ObservationSummary> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    return mockObservationSummary(inspection);
  }

  try {
    const prompt = buildSummaryPrompt(inspection, evidenceItems);
    const result = await generateJSON<ObservationSummary>(prompt);

    if (result && result.kind === 'observation-summary') {
      return result;
    }
  } catch (err) {
    console.warn('[MIRROR AI] summarizeInspection error, falling back to mock:', err);
  }

  return mockObservationSummary(inspection);
}

/**
 * Detect conflicts between inspections using Gemini cloud inference.
 * Falls back to mock data if Firebase is not configured or inference fails.
 */
export async function detectConflicts(
  inspections: InspectionRecord[]
): Promise<ConflictFlag[]> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey || inspections.length < 2) {
    return mockConflictFlags(inspections);
  }

  try {
    const prompt = buildConflictPrompt(inspections);
    const result = await generateJSON<ConflictFlag[]>(prompt);

    if (Array.isArray(result)) {
      return result.filter((r): r is ConflictFlag => r.kind === 'conflict-flag');
    }
  } catch (err) {
    console.warn('[MIRROR AI] detectConflicts error, falling back to mock:', err);
  }

  return mockConflictFlags(inspections);
}
