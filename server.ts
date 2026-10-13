import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { policyStore } from './server/policyStore';
import { translateBatchService, translateSingleUniversal } from './server/translateService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === MULTI-USER POLICY DATA SYNC APIS ===

  // 1. Get entire current policy state & version
  app.get('/api/policy', (req, res) => {
    res.json(policyStore.getAll());
  });

  // 1.1. Client-to-server sync (protects user-entered data from being overwritten by fresh baseline after publish)
  app.post('/api/policy/sync-from-client', (req, res) => {
    const { l1Data, l2Data, l3Data, lastModified, clientId, force } = req.body;
    if (!l1Data || !l2Data || !l3Data) {
      return res.status(400).json({ error: 'Invalid policy payload from client' });
    }
    const state = policyStore.syncFromClient({
      l1Data,
      l2Data,
      l3Data,
      lastModified,
      clientId,
      force,
    });
    res.json(state);
  });

  // 1.2. Restore full backup from JSON
  app.post('/api/policy/restore-backup', (req, res) => {
    const { l1Data, l2Data, l3Data, clientId } = req.body;
    if (!l1Data || !l2Data || !l3Data) {
      return res.status(400).json({ error: 'Invalid backup file structure' });
    }
    const state = policyStore.restoreBackup({ l1Data, l2Data, l3Data }, clientId);
    res.json(state);
  });

  // 2. Lightweight version poll (for clients to detect changes from other machines)
  app.get('/api/policy/version', (req, res) => {
    res.json(policyStore.getVersionInfo());
  });

  // 3. Granular KPI monthly cell update (prevents overwriting between different cells/KPIs)
  app.post('/api/policy/kpi-monthly', (req, res) => {
    const { level, kpiId, month, field, value, clientId } = req.body;
    if (!level || !kpiId || !month || !field) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const state = policyStore.updateKpiMonthly(level, kpiId, month, field, value, clientId);
    res.json(state);
  });

  // 4. Granular 8D Problem Details update
  app.post('/api/policy/kpi-details', (req, res) => {
    const { level, kpiId, problemDescription, rootCause, actionPlan, clientId } = req.body;
    if (!level || !kpiId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const state = policyStore.updateKpiDetails(
      level,
      kpiId,
      problemDescription || '',
      rootCause || '',
      actionPlan || '',
      clientId
    );
    res.json(state);
  });

  // 5. Update KPI metadata
  app.post('/api/policy/update-kpi', (req, res) => {
    const { updatedKpi, clientId } = req.body;
    if (!updatedKpi || !updatedKpi.id) {
      return res.status(400).json({ error: 'Invalid KPI object' });
    }
    const state = policyStore.updateKpi(updatedKpi, clientId);
    res.json(state);
  });

  // 6. Add new KPI
  app.post('/api/policy/add-kpi', (req, res) => {
    const { level, newKpi, clientId } = req.body;
    if (!level || !newKpi) {
      return res.status(400).json({ error: 'Invalid parameters for adding KPI' });
    }
    const state = policyStore.addKpi(level, newKpi, clientId);
    res.json(state);
  });

  // 6.1. Bulk Upsert KPIs (from Excel Import)
  app.post('/api/policy/bulk-kpi', (req, res) => {
    const { level, kpis, clientId } = req.body;
    if (!level || !Array.isArray(kpis)) {
      return res.status(400).json({ error: 'Invalid parameters for bulk KPI upsert' });
    }
    const state = policyStore.bulkUpsertKpis(level, kpis, clientId);
    res.json(state);
  });

  // 6.2. Bulk Multi-Sheet Import (6 sheets mapping)
  app.post('/api/policy/bulk-multi', (req, res) => {
    const { payload, clientId } = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload for bulk multi-sheet import' });
    }
    const state = policyStore.bulkImportMultiLevel(payload, clientId);
    res.json(state);
  });

  // 7. Delete KPI
  app.post('/api/policy/delete-kpi', (req, res) => {
    const { kpiId, clientId } = req.body;
    if (!kpiId) {
      return res.status(400).json({ error: 'Missing kpiId' });
    }
    const state = policyStore.deleteKpi(kpiId, clientId);
    res.json(state);
  });

  // 8. Objectives (3-Year and Annual)
  app.post('/api/policy/objective', (req, res) => {
    const { level, action, objective, isThreeYear, clientId } = req.body;
    if (!level || !action || !objective) {
      return res.status(400).json({ error: 'Invalid parameters for objective' });
    }
    const state = policyStore.updateObjective(level, action, objective, isThreeYear, clientId);
    res.json(state);
  });

  // 9. Priorities
  app.post('/api/policy/priority', (req, res) => {
    const { level, action, priority, clientId } = req.body;
    if (!level || !action || !priority) {
      return res.status(400).json({ error: 'Invalid parameters for priority' });
    }
    const state = policyStore.updatePriority(level, action, priority, clientId);
    res.json(state);
  });

  // 10. Resources
  app.post('/api/policy/resource', (req, res) => {
    const { level, action, resource, clientId } = req.body;
    if (!level || !action || !resource) {
      return res.status(400).json({ error: 'Invalid parameters for resource' });
    }
    const state = policyStore.updateResource(level, action, resource, clientId);
    res.json(state);
  });

  // 10.05. Correlations & Matrix Links
  app.post('/api/policy/correlation', (req, res) => {
    const { level, key, value, clientId } = req.body;
    if (!level || !key || !value) {
      return res.status(400).json({ error: 'Invalid parameters for correlation' });
    }
    const state = policyStore.updateCorrelation(level, key, value, clientId);
    res.json(state);
  });

  // 10.1. Update Level Metadata (Owner, Title, Rev Date)
  app.post('/api/policy/level-meta', (req, res) => {
    const { level, meta, clientId } = req.body;
    if (!level || !meta) {
      return res.status(400).json({ error: 'Invalid parameters for level metadata' });
    }
    const state = policyStore.updateLevelMeta(level, meta, clientId);
    res.json(state);
  });

  // 11. Reset to baseline
  app.post('/api/policy/reset', (req, res) => {
    const { clientId } = req.body;
    const state = policyStore.resetToBaseline(clientId);
    res.json(state);
  });

  // 12. Batch AI Auto-Translation (English -> Vietnamese & Korean)
  app.post('/api/policy/translate-batch', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Expected items array' });
      }
      const results = await translateBatchService(items);
      res.json({ results });
    } catch (err: any) {
      console.error('[API Translate Error]:', err);
      res.status(500).json({ error: err.message || 'Translation failed' });
    }
  });

  // 12.1. Bidirectional Real-Time AI Auto-Translation (En <-> Vi <-> Ko)
  app.post('/api/policy/translate-single', async (req, res) => {
    try {
      const { text, fromLang, context } = req.body;
      const result = await translateSingleUniversal({ text, fromLang, context });
      res.json(result);
    } catch (err: any) {
      console.error('[API Single Translate Error]:', err);
      res.status(500).json({ error: err.message || 'Translation failed' });
    }
  });

  // === AI ANALYSIS ROUTE ===
  // API Route: AI Policy Advisor & KPI Analysis
  app.post('/api/analyze-kpi', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY is not configured in secrets.',
        });
      }

      const { kpi, level, language } = req.body;

      const ai = new GoogleGenAI({ apiKey });
      const langText = language === 'vi' ? 'Tiếng Việt' : language === 'ko' ? '한국어' : 'English';

      const prompt = `
You are an expert Lean Manufacturing & Hoshin Kanri (Policy Deployment) Master Consultant for Vietnam Samho Co. Ltd.
Analyze the following KPI target performance and provide a structured Lean action plan.

KPI Information:
- Code: ${kpi.code}
- Title: ${kpi.name} (${kpi.nameVi || ''}) [Korean: ${kpi.nameKo || ''}]
- Level: ${level}
- Department: ${kpi.department}
- Responsible Owner: ${kpi.owner}
- Target Direction: ${kpi.targetDirection}
- Unit: ${kpi.unit}
- Monthly Records (Jan-May 2026): ${JSON.stringify(kpi.monthly)}
- Current Problem Description: ${kpi.problemDescription || 'Performance gap identified'}
- Current Root Cause: ${kpi.rootCause || 'Under investigation'}

Please output your response in ${langText} with the following markdown structured layout:
1. **Assessment & Severity Analysis**: Brief summary of target vs actual performance gap.
2. **Root Cause Analysis (5-Why)**: Logical breakdown of probable root causes in factory operations (cutting, stitching, assembly, EOLR, scheduling).
3. **Lean Corrective Actions (8D / Kaizen)**: 3-4 immediate & long-term actionable countermeasures.
4. **Impact on Top Level Objectives**: How resolving this KPI supports Vietnam Samho 2026 annual objectives (e.g. Best partnership factory for NB, 832k capacity expansion).
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({
        analysis: response.text,
      });
    } catch (err: any) {
      console.error('Error analyzing KPI:', err);
      res.status(500).json({
        error: err.message || 'Failed to perform AI analysis.',
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Policy Deployment System running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start server:', err);
  process.exit(1);
});
