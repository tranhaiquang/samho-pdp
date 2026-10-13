/**
 * Static-site API shim.
 *
 * The app talks to its Express backend exclusively through `fetch('/api/...')`.
 * On a static host there is no backend, so this module intercepts those calls
 * and satisfies them from `localStorage` via the browser build of the policy
 * store. Every existing component keeps working unmodified.
 *
 * The two AI endpoints cannot work without a server: they need a Gemini API key
 * that must never be shipped to the browser. They return a clear 501 explaining
 * this rather than failing silently.
 */

/** Structural view of the store; avoids coupling to its non-exported class. */
type Store = typeof import('../../server/policyStore_static')['policyStore'];

let storePromise: Promise<Store> | null = null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Load the shipped seed snapshot (current production data) before the store
 * constructs itself, so first-time visitors on a static host start with real
 * data instead of an empty baseline.
 */
async function bootstrap(): Promise<Store> {
  if (!window.__SAMHO_SEED__) {
    try {
      const res = await fetch(new URL('seed-policy-data.json', window.location.href).href, {
        cache: 'no-cache',
      });
      if (res.ok) window.__SAMHO_SEED__ = await res.json();
    } catch (err) {
      console.warn('[StaticAPI] Could not fetch seed data, using compiled baseline:', err);
    }
  }
  const mod = await import('../../server/policyStore_static');
  return mod.policyStore;
}

function getStore(): Promise<Store> {
  if (!storePromise) storePromise = bootstrap();
  return storePromise;
}

/**
 * Callers pass a plain string URL plus `init.body`, so `input` is often a string
 * rather than a Request and has no .clone(). Handle both shapes.
 */
async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  try {
    if (input instanceof Request) return await input.clone().json();
    if (typeof init?.body === 'string') return JSON.parse(init.body);
    return {};
  } catch {
    return {};
  }
}

/** Same translation prompt the Express build sends, minus the dictionary layer. */
function translateItems(items: any[], fromLang: string, context?: string) {
  const prompt = `You are a professional industrial translator for Vietnam Samho Co. Ltd (Korean-owned footwear manufacturing company in Vietnam producing for New Balance).
Translate each English text into natural industrial Vietnamese (tiếng Việt chuẩn nhà máy sản xuất giày/Lean) AND Korean (한국어 표준 제조업/린 경영 용어).
Source language hint: ${fromLang || 'auto'}
${context ? `Domain context: ${context}` : ''}

Input items JSON:
${JSON.stringify(items)}

Respond ONLY with a valid JSON array containing exact schema:
[
  {
    "id": "item-id",
    "textEn": "original english",
    "textVi": "vietnamese translation",
    "textKo": "korean translation"
  }
]
No markdown, no backticks if possible, just valid JSON.`;

  return callGemini(prompt).then((raw) =>
    JSON.parse(
      raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()
    )
  );
}

function analyzeKpi(kpi: any, level: string, language: string) {
  const langText = language === 'vi' ? 'Tiếng Việt' : language === 'ko' ? '한국어' : 'English';
  const prompt = `
You are an expert Lean Manufacturing & Hoshin Kanri (Policy Deployment) Master Consultant for Vietnam Samho Co. Ltd.
Analyze the following KPI target performance and provide a structured Lean action plan.

KPI Information:
- Code: ${kpi?.code}
- Title: ${kpi?.name} (${kpi?.nameVi || ''}) [Korean: ${kpi?.nameKo || ''}]
- Level: ${level}
- Department: ${kpi?.department}
- Responsible Owner: ${kpi?.owner}
- Target Direction: ${kpi?.targetDirection}
- Unit: ${kpi?.unit}
- Monthly Records (Jan-May 2026): ${JSON.stringify(kpi?.monthly)}
- Current Problem Description: ${kpi?.problemDescription || 'Performance gap identified'}
- Current Root Cause: ${kpi?.rootCause || 'Under investigation'}

Please output your response in ${langText} with the following markdown structured layout:
1. **Assessment & Severity Analysis**: Brief summary of target vs actual performance gap.
2. **Root Cause Analysis (5-Why)**: Logical breakdown of probable root causes in factory operations (cutting, stitching, assembly, EOLR, scheduling).
3. **Lean Corrective Actions (8D / Kaizen)**: 3-4 immediate & long-term actionable countermeasures.
4. **Impact on Top Level Objectives**: How resolving this KPI supports Vietnam Samho 2026 annual objectives (e.g. Best partnership factory for NB, 832k capacity expansion).
`;

  return callGemini(prompt);
}

/** Requires a user-supplied key from the in-app Settings panel. */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = localStorage.getItem('samho_gemini_api_key');
  if (!apiKey) throw new Error('NO_API_KEY');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
}

function aiUnavailable(kind: string): Response {
  return json(
    {
      error: `AI ${kind} is unavailable on the static site.`,
      code: 'AI_REQUIRES_USER_KEY',
      hint: 'Open Settings and paste your Gemini API key. It is stored only in this browser and sent straight to Google.',
    },
    501
  );
}

export function installStaticApi(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();

    if (!url.includes('/api/')) return originalFetch(input as any, init);

    const route = url.split('?')[0];

    try {
      const store = await getStore();

      if (route.endsWith('/api/health')) {
        return json({ status: 'ok', mode: 'static', timestamp: new Date().toISOString() });
      }

      // --- AI endpoints: cannot work without a user-supplied key ---
      if (route.endsWith('/api/analyze-kpi')) {
        try {
          const body = await readBody(input, init);
          return json({ analysis: await analyzeKpi(body.kpi, body.level, body.language) });
        } catch (e: any) {
          if (e.message === 'NO_API_KEY') return aiUnavailable('KPI analysis');
          return json({ error: e.message }, 500);
        }
      }

      if (route.endsWith('/api/policy/translate-single')) {
        const body = await readBody(input, init);
        try {
          const [out] = await translateItems([{ id: 'single', text: body.text }], body.fromLang, body.context);
          return json({ textEn: out.textEn, textVi: out.textVi, textKo: out.textKo });
        } catch (e: any) {
          if (e.message === 'NO_API_KEY') return aiUnavailable('translation');
          return json({ error: e.message }, 500);
        }
      }

      if (route.endsWith('/api/policy/translate-batch')) {
        const body = await readBody(input, init);
        try {
          const results = await translateItems(body.items || [], 'en');
          return json({ results });
        } catch (e: any) {
          if (e.message === 'NO_API_KEY') return aiUnavailable('batch translation');
          return json({ error: e.message }, 500);
        }
      }

      // --- Policy data endpoints: served from localStorage ---
      if (route.endsWith('/api/policy')) return json(store.getAll());
      if (route.endsWith('/api/policy/version')) return json(store.getVersionInfo());

      const body = method === 'POST' ? await readBody(input, init) : {};

      switch (route) {
        case '/api/policy/sync-from-client':
          return json(store.syncFromClient(body));
        case '/api/policy/restore-backup':
          return json(store.restoreBackup(body, body.clientId));
        case '/api/policy/kpi-monthly':
          return json(store.updateKpiMonthly(body.level, body.kpiId, body.month, body.field, body.value, body.clientId));
        case '/api/policy/kpi-details':
          return json(store.updateKpiDetails(body.level, body.kpiId, body.problemDescription, body.rootCause, body.actionPlan, body.clientId));
        case '/api/policy/correlation':
          return json(store.updateCorrelation(body.level, body.key, body.value, body.clientId));
        case '/api/policy/update-kpi':
          return json(store.updateKpi(body.updatedKpi, body.clientId));
        case '/api/policy/add-kpi':
          return json(store.addKpi(body.level, body.newKpi, body.clientId));
        case '/api/policy/bulk-kpi':
          return json(store.bulkUpsertKpis(body.level, body.kpis, body.clientId));
        case '/api/policy/bulk-multi':
          return json(store.bulkImportMultiLevel(body.payload, body.clientId));
        case '/api/policy/delete-kpi':
          return json(store.deleteKpi(body.kpiId, body.clientId));
        case '/api/policy/objective':
          return json(store.updateObjective(body.level, body.action, body.objective, body.isThreeYear, body.clientId));
        case '/api/policy/priority':
          return json(store.updatePriority(body.level, body.action, body.priority, body.clientId));
        case '/api/policy/resource':
          return json(store.updateResource(body.level, body.action, body.resource, body.clientId));
        case '/api/policy/level-meta':
          return json(store.updateLevelMeta(body.level, body.meta, body.clientId));
        case '/api/policy/reset':
          return json(store.resetToBaseline(body.clientId));
        default:
          return json({ error: `Unhandled static route: ${route}` }, 404);
      }
    } catch (err: any) {
      console.error('[StaticAPI] shim error:', err);
      return json({ error: err.message || 'Static API failure' }, 500);
    }
  };
}