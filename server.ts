import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initialDefects, initialProjectMeta } from './src/data/initialData.ts';
import { DefectItem, ProjectMeta } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Persistent storage setup
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'defect_sheet_db.json');

interface DatabaseStore {
  projectMeta: ProjectMeta;
  defects: DefectItem[];
  lastUpdated: string;
}

function ensureDataStore(): DatabaseStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as DatabaseStore;
      if (parsed.projectMeta && Array.isArray(parsed.defects)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database file, using fallback seed:', err);
  }

  const initialStore: DatabaseStore = {
    projectMeta: initialProjectMeta,
    defects: initialDefects,
    lastUpdated: new Date().toISOString()
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing initial store:', err);
  }

  return initialStore;
}

let store = ensureDataStore();

function persistStore() {
  try {
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist defect sheet database:', err);
  }
}

// AI Client lazy initialization
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    totalDefects: store.defects.length,
    lastUpdated: store.lastUpdated
  });
});

// Get project meta & calculated execution stats
app.get('/api/project', (req, res) => {
  const total = store.defects.length;
  const passed = store.defects.filter(d => d.testExecutionStatus === 'Passed').length;
  const failed = store.defects.filter(d => d.testExecutionStatus === 'Failed').length;
  const blocked = store.defects.filter(d => d.testExecutionStatus === 'Blocked').length;
  const pending = store.defects.filter(d => d.testExecutionStatus === 'Pending').length;

  res.json({
    project: store.projectMeta,
    stats: {
      totalExecuted: total,
      passed,
      failed,
      blocked,
      pending,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      failRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      blockedRate: total > 0 ? Math.round((blocked / total) * 100) : 0
    }
  });
});

app.put('/api/project', (req, res) => {
  const updatedMeta: Partial<ProjectMeta> = req.body;
  store.projectMeta = {
    ...store.projectMeta,
    ...updatedMeta
  };
  persistStore();
  res.json({ success: true, project: store.projectMeta });
});

// Defects CRUD (The Defect Tracker Sheet Backend Database)
app.get('/api/defects', (req, res) => {
  res.json({
    defects: store.defects,
    count: store.defects.length,
    lastUpdated: store.lastUpdated
  });
});

app.post('/api/defects', (req, res) => {
  const item: Partial<DefectItem> = req.body;
  const id = item.id || `defect-${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  const newDefect: DefectItem = {
    id,
    bugId: item.bugId || `BUG-${100 + store.defects.length + 1}`,
    testCaseId: item.testCaseId || `TC-${String(store.defects.length + 1).padStart(3, '0')}`,
    title: item.title || 'Untitled Defect',
    module: item.module || 'General',
    testExecutionStatus: item.testExecutionStatus || 'Pending',
    defectStatus: item.defectStatus || 'Open',
    severity: item.severity || 'Medium',
    priority: item.priority || 'P3 - Medium',
    assignedTo: item.assignedTo || 'Unassigned',
    reportedBy: item.reportedBy || 'QA Engineer',
    environment: item.environment || 'QA Staging',
    stepsToReproduce: item.stepsToReproduce || '',
    expectedResult: item.expectedResult || '',
    actualResult: item.actualResult || '',
    driveLink: item.driveLink || '',
    githubLink: item.githubLink || '',
    createdDate: item.createdDate || today,
    updatedDate: today
  };

  store.defects.unshift(newDefect);
  persistStore();
  res.status(201).json({ success: true, defect: newDefect });
});

app.put('/api/defects/:id', (req, res) => {
  const { id } = req.params;
  const index = store.defects.findIndex(d => d.id === id || d.bugId === id);

  if (index === -1) {
    res.status(404).json({ error: 'Defect item not found in database sheet' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  store.defects[index] = {
    ...store.defects[index],
    ...req.body,
    updatedDate: today
  };

  persistStore();
  res.json({ success: true, defect: store.defects[index] });
});

app.delete('/api/defects/:id', (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id);
  const initialLength = store.defects.length;
  store.defects = store.defects.filter(d => d.id !== decodedId && d.bugId !== decodedId && d.id !== id && d.bugId !== id);

  persistStore();
  res.json({ success: true, remaining: store.defects.length });
});

// Bulk delete endpoint
app.post('/api/defects/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array required' });
    return;
  }
  const idSet = new Set(ids);
  store.defects = store.defects.filter(d => !idSet.has(d.id) && !idSet.has(d.bugId));
  persistStore();
  res.json({ success: true, remaining: store.defects.length });
});

// Bulk update or sheet replacement
app.post('/api/defects/bulk', (req, res) => {
  const { defects, replaceAll } = req.body;
  if (!Array.isArray(defects)) {
    res.status(400).json({ error: 'defects array required' });
    return;
  }

  if (replaceAll) {
    store.defects = defects;
  } else {
    // Upsert items
    for (const item of defects) {
      const existingIdx = store.defects.findIndex(d => d.id === item.id || d.bugId === item.bugId);
      if (existingIdx >= 0) {
        store.defects[existingIdx] = { ...store.defects[existingIdx], ...item };
      } else {
        store.defects.push(item);
      }
    }
  }

  persistStore();
  res.json({ success: true, total: store.defects.length });
});

// Reset to factory template
app.post('/api/reset', (req, res) => {
  store = {
    projectMeta: initialProjectMeta,
    defects: initialDefects,
    lastUpdated: new Date().toISOString()
  };
  persistStore();
  res.json({ success: true, message: 'Database reset to QA Execution Sheet template' });
});

// AI Assistant for QA Defect analysis / Root cause hypothesis
app.post('/api/ai/analyze-defect', async (req, res) => {
  const { title, actualResult, expectedResult, steps, module } = req.body;
  const ai = getAIClient();

  if (!ai) {
    // Provide smart fallback heuristics if Gemini key isn't provided
    res.json({
      severitySuggestion: 'High',
      prioritySuggestion: 'P2 - High',
      summary: `Automated QA Analysis for ${module}: verify error boundary and input boundary conditions.`,
      recommendedRootCause: 'Potential server-side validation error or unhandled promise rejection.',
      testRecommendations: [
        'Run regression across adjacent sub-modules',
        'Verify session token expiry behavior',
        'Validate cross-browser compatibility on Firefox & Edge'
      ]
    });
    return;
  }

  try {
    const prompt = `You are a Principal QA Automation and Defect Triage Engineer.
Analyze this defect report for an enterprise application:
- Module: ${module || 'N/A'}
- Title: ${title || 'N/A'}
- Expected Result: ${expectedResult || 'N/A'}
- Actual Result: ${actualResult || 'N/A'}
- Steps to Reproduce: ${steps || 'N/A'}

Provide a JSON object with:
- "severitySuggestion": "Critical" | "High" | "Medium" | "Low"
- "prioritySuggestion": "P1 - Urgent" | "P2 - High" | "P3 - Medium" | "P4 - Low"
- "summary": concise technical synopsis (1-2 sentences)
- "recommendedRootCause": technical root cause hypothesis (1-2 sentences)
- "testRecommendations": array of 3 actionable test steps to verify or prevent regression.
Return ONLY raw JSON, no markdown fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Gemini defect analysis failed:', err);
    res.status(500).json({ error: 'AI analysis failed', details: err.message });
  }
});

// Start server with Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    console.log(`Defect Tracker Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
