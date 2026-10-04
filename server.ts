import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  MOCK_CYCLES,
  MOCK_ANOMALIES,
  MOCK_ALERTS,
  generateFieldComparison,
  queryAlerts,
  runSyntheticForecastPipeline,
} from './src/server/weatherData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json());

  // === REST API ENDPOINTS (conforming to architecture.md & api/main.py) ===

  // 1. Health Status
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: '0.1.0',
      last_cycle: MOCK_CYCLES[MOCK_CYCLES.length - 1],
      active_anomalies_count: MOCK_ANOMALIES.length,
      active_alerts_count: MOCK_ALERTS.length,
      ensemble_members_loaded: 51,
      diffusion_sampler: 'DDIM 25 steps (CorrDiff-style)',
    });
  });

  // 2. Forecast Cycles
  app.get('/v1/cycles', (req: Request, res: Response) => {
    res.json(MOCK_CYCLES);
  });

  // 3. Anomalies
  app.get('/v1/anomalies', (req: Request, res: Response) => {
    const cycle = req.query.cycle as string | undefined;
    // Returns active detected anomaly tracks for a cycle
    res.json(MOCK_ANOMALIES);
  });

  // 4. Anomaly Detail
  app.get('/v1/anomalies/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const anomaly = MOCK_ANOMALIES.find(a => a.track_id.toLowerCase() === id.toLowerCase());
    if (!anomaly) {
      res.status(404).json({ error: `Anomaly track ${id} not found` });
      return;
    }
    res.json(anomaly);
  });

  // 5. Downscaled Fields (5 km amplitude-preserving downscaled statistics & matrix)
  app.get('/v1/anomalies/:id/downscaled', (req: Request, res: Response) => {
    const { id } = req.params;
    const leadTimeHours = req.query.lead_time_hours ? parseInt(req.query.lead_time_hours as string, 10) : 96;
    const anomaly = MOCK_ANOMALIES.find(a => a.track_id.toLowerCase() === id.toLowerCase());

    if (!anomaly) {
      res.status(404).json({ error: `Anomaly track ${id} not found` });
      return;
    }

    const fieldData = generateFieldComparison(anomaly.track_id, leadTimeHours);
    res.json(fieldData);
  });

  // 6. Alerts List (with optional category filter)
  app.get('/v1/alerts', (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    if (category) {
      const filtered = MOCK_ALERTS.filter(a => a.category.toLowerCase() === category.toLowerCase());
      res.json(filtered);
      return;
    }
    res.json(MOCK_ALERTS);
  });

  // 7. Alert Spatial & Temporal Query
  app.post('/v1/alerts/query', (req: Request, res: Response) => {
    const { point, radius_km, category, min_lead_time_hours, max_lead_time_hours } = req.body || {};
    const results = queryAlerts(
      category,
      min_lead_time_hours,
      max_lead_time_hours,
      point,
      radius_km
    );
    res.json(results);
  });

  // 8. Pipeline Execution Simulation Stream (Server-Sent Events)
  app.get('/v1/pipeline/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const cycle = req.query.cycle || "unknown";
    const steps = [
        { name: "Stage 0: 30-Year ERA5 EFI Ingestion", detail: "Evaluating Extreme Forecast Index tail quantile differences across 51 members" },
        { name: "Stage 1: Spherical Icosahedral Mesh GNN", detail: "Message-passing graph convolutions on geodesic spherical coordinates" },
        { name: "Stage 2: Conditional CorrDiff Residual Diffusion", detail: "Executing 25-step DDIM sampler preserving extreme localized amplitudes" },
        { name: "Stage 3: Physical Conservation Invariants", detail: "Verifying aggregation mass conservation and moisture flux divergence" },
        { name: "Stage 4: Geodesic 5 km Warning Cartography", detail: "Generating 32-point polygon core geometries and tiered advisory bulletins" },
    ];
    
    res.write(`data: ${JSON.stringify({ type: 'log', message: `[Pipeline] Ingesting NEPS-G 12 km operational forecast cycle ${cycle}...` })}\n\n`);
    
    let i = 0;
    
    const processStep = () => {
      if (i >= steps.length) {
        res.write(`data: ${JSON.stringify({ type: 'log', message: '[Pipeline] Full forecast cycle completed! Bulletins synchronized to REST API.' })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        res.end();
        return;
      }
      
      const step = steps[i];
      res.write(`data: ${JSON.stringify({ type: 'step', step: i })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'log', message: `[${step.name}] Processing: ${step.detail}` })}\n\n`);
      
      setTimeout(() => {
        res.write(`data: ${JSON.stringify({ type: 'log', message: `[${step.name}] Verified and completed.` })}\n\n`);
        i++;
        processStep();
      }, 650);
    };
    
    processStep();

    req.on('close', () => {
      res.end();
    });
  });

  // === STATIC / VITE MIDDLEWARE ===
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('*', (req: Request, res: Response) => {
        res.send('Production build not found. Please run npm run build.');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Studio] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[AI Studio] Fatal server error:', err);
  process.exit(1);
});
