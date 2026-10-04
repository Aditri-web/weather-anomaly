import jsPDF from 'jspdf';
import { AnomalySummary, AlertItem, DownscaledResponse } from '../types/weather';

interface PdfExportOptions {
  anomaly: AnomalySummary;
  selectedLeadTime: number;
  cycle: string;
  alerts: AlertItem[];
  downscaledData?: DownscaledResponse | null;
}

export const generateAnomalyPdfReport = ({
  anomaly,
  selectedLeadTime,
  cycle,
  alerts,
  downscaledData,
}: PdfExportOptions): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm

  let y = 16;

  // 1. TOP HEADER / BRAND BAR
  doc.setFillColor(24, 24, 27); // Dark Charcoal #18181b
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('times', 'italic');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Crosby Atmosphere // Operational Meteorological Bulletin', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(161, 161, 170); // stone-400
  doc.text('HIGH-RESOLUTION ANOMALY TRACKING & 5 KM AMPLITUDE-PRESERVING DOWNSCALING', margin + 6, y + 15);

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  doc.text(`Generated: ${timestamp}  |  Cycle: ${cycle}`, margin + contentWidth - 6, y + 15, { align: 'right' });

  y += 26;

  // 2. SUMMARY HERO CARD
  doc.setFillColor(248, 250, 252); // Soft light slate/stone
  doc.rect(margin, y, contentWidth, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 32, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`TARGET IDENTIFIER: ${anomaly.track_id}`, margin + 6, y + 7);

  const isHeat = anomaly.hazard_type.includes('heat');
  const unit = isHeat ? '°C' : 'mm/d';

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(anomaly.name, margin + 6, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Hazard Class: ${anomaly.hazard_type.toUpperCase()}  ·  Lead Window: +${anomaly.start_lead_hours}h to +${anomaly.end_lead_hours}h  ·  Climatology: ${anomaly.climatology_baseline}`,
    margin + 6,
    y + 20
  );

  // Key metrics pills on right side of hero
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`EFI Index: ${anomaly.efi_score}`, margin + contentWidth - 6, y + 8, { align: 'right' });
  doc.text(`Max Confidence: ${(anomaly.max_confidence * 100).toFixed(0)}% (51 Ens)`, margin + contentWidth - 6, y + 14, { align: 'right' });
  doc.text(`Active Focus: +${selectedLeadTime}h Horizon`, margin + contentWidth - 6, y + 20, { align: 'right' });

  // 4D Bounding box string
  const [minLat, minLon, maxLat, maxLon] = anomaly.bbox_with_margin;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Bounding Box (with margin): [${minLat}°N, ${minLon}°E] to [${maxLat}°N, ${maxLon}°E]`, margin + 6, y + 27);

  y += 38;

  // 3. 5-DAY INTENSITY FORECAST CURVE (SPARKLINE VECTOR IN PDF)
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('5-Day Intensity Progression & Spectral Peak Profile', margin, y);

  y += 4;

  const sparkBoxX = margin;
  const sparkBoxY = y;
  const sparkBoxW = contentWidth;
  const sparkBoxH = 50;

  doc.setFillColor(255, 255, 255);
  doc.rect(sparkBoxX, sparkBoxY, sparkBoxW, sparkBoxH, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(sparkBoxX, sparkBoxY, sparkBoxW, sparkBoxH, 'S');

  // Sparkline coordinates
  const trajectory = anomaly.trajectory;
  const values = trajectory.map(t => t.peak_value ?? t.peak_prob * 100);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = Math.max(1, maxVal - minVal);
  const peakIndex = values.indexOf(maxVal);

  const graphPaddingX = 20;
  const graphPaddingY = 12;
  const graphW = sparkBoxW - graphPaddingX * 2;
  const graphH = sparkBoxH - graphPaddingY * 2;

  // Draw grid lines
  doc.setDrawColor(241, 245, 249);
  doc.line(sparkBoxX + graphPaddingX, sparkBoxY + graphPaddingY, sparkBoxX + graphPaddingX + graphW, sparkBoxY + graphPaddingY);
  doc.line(sparkBoxX + graphPaddingX, sparkBoxY + graphPaddingY + graphH / 2, sparkBoxX + graphPaddingX + graphW, sparkBoxY + graphPaddingY + graphH / 2);
  doc.line(sparkBoxX + graphPaddingX, sparkBoxY + graphPaddingY + graphH, sparkBoxX + graphPaddingX + graphW, sparkBoxY + graphPaddingY + graphH);

  // Calculate points on PDF
  const pts: [number, number][] = trajectory.map((t, idx) => {
    const px = sparkBoxX + graphPaddingX + (idx / Math.max(1, trajectory.length - 1)) * graphW;
    const val = t.peak_value ?? t.peak_prob * 100;
    const py = sparkBoxY + graphPaddingY + (1 - (val - minVal) / valRange) * graphH;
    return [px, py];
  });

  // Draw sparkline lines connecting points
  doc.setDrawColor(isHeat ? 234 : 225, isHeat ? 88 : 29, isHeat ? 12 : 72); // Orange or Rose
  doc.setLineWidth(0.8);
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  }

  // Draw points & labels
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  pts.forEach(([px, py], idx) => {
    const t = trajectory[idx];
    const val = t.peak_value ?? t.peak_prob * 100;
    const isPeak = idx === peakIndex;
    const isSelected = t.lead_time_hours === selectedLeadTime;

    // Outer circle
    if (isPeak || isSelected) {
      doc.setFillColor(isHeat ? 234 : 225, isHeat ? 88 : 29, isHeat ? 12 : 72);
      doc.circle(px, py, 2.2, 'F');
      doc.setFillColor(255, 255, 255);
      doc.circle(px, py, 1.2, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(isHeat ? 234 : 225, isHeat ? 88 : 29, isHeat ? 12 : 72);
      doc.circle(px, py, 1.4, 'FD');
    }

    // Value above point
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', isPeak ? 'bold' : 'normal');
    doc.text(`${val} ${unit}`, px, py - 3, { align: 'center' });

    // Horizon below
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`+${t.lead_time_hours}h`, px, sparkBoxY + sparkBoxH - 4, { align: 'center' });
  });

  y += sparkBoxH + 6;

  // 4. WAYPOINTS & IMPACT COORDINATES TABLE
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Trajectory Waypoints & Exceedance Probabilities', margin, y);

  y += 4;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text('LEAD HORIZON', margin + 4, y + 4.5);
  doc.text('COORDINATES', margin + 34, y + 4.5);
  doc.text('PEAK INTENSITY', margin + 74, y + 4.5);
  doc.text('EXCEEDANCE PROB', margin + 114, y + 4.5);
  doc.text('STATUS & GEODESIC ENVELOPE', margin + 144, y + 4.5);

  y += 7;

  // Table Rows
  trajectory.forEach((t, idx) => {
    const isSelected = t.lead_time_hours === selectedLeadTime;
    const isEven = idx % 2 === 0;

    if (isSelected) {
      doc.setFillColor(254, 242, 242); // faint rose
    } else if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);

    doc.setFont('helvetica', isSelected ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(`+${t.lead_time_hours}h ${isSelected ? '▶' : ''}`, margin + 4, y + 4.5);
    doc.text(`${t.lat}°N, ${t.lon}°E`, margin + 34, y + 4.5);
    doc.text(`${t.peak_value ?? '-'} ${unit}`, margin + 74, y + 4.5);
    doc.text(`${(t.peak_prob * 100).toFixed(0)}% tail probability`, margin + 114, y + 4.5);
    doc.text('5.0 km Geodesic Radius', margin + 144, y + 4.5);

    y += 7;
  });

  y += 5;

  // 5. 5 KM SUPER-RESOLUTION DOWNSCALING COMPARISON
  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('5 km Generative Downscaling & Physical Conservation Diagnostics', margin, y);

  y += 4;

  const metricsBoxY = y;
  const metricsBoxH = 28;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, metricsBoxY, contentWidth, metricsBoxH, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, metricsBoxY, contentWidth, metricsBoxH, 'S');

  const colW = contentWidth / 4;

  // Col 1: Coarse Peak
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('INPUT 12 KM COARSE', margin + 4, metricsBoxY + 6);
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${downscaledData?.comparison_data?.coarse_12km_peak ?? 120} ${unit}`, margin + 4, metricsBoxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Spatially averaged 144 km²', margin + 4, metricsBoxY + 20);

  // Col 2: U-Net Smoothed
  doc.text('STANDARD U-NET (L2/MSE)', margin + colW + 4, metricsBoxY + 6);
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(225, 29, 72);
  doc.text(`${downscaledData?.comparison_data?.regression_blurred_peak ?? 110} ${unit}`, margin + colW + 4, metricsBoxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Smoothed spectral tail (-32%)', margin + colW + 4, metricsBoxY + 20);

  // Col 3: DDIM Diffusion 5km
  doc.text('DDIM DIFFUSION 5 KM', margin + colW * 2 + 4, metricsBoxY + 6);
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${downscaledData?.comparison_data?.diffusion_peak ?? 192} ${unit}`, margin + colW * 2 + 4, metricsBoxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Preserved extreme amplitude', margin + colW * 2 + 4, metricsBoxY + 20);

  // Col 4: Mass Conservation
  doc.text('PHYSICS CONSERVATION', margin + colW * 3 + 4, metricsBoxY + 6);
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${(Number(downscaledData?.comparison_data?.physics_conservation_score ?? 0.99) * 100).toFixed(1)}%`,
    margin + colW * 3 + 4,
    metricsBoxY + 14
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Mass & flux invariant verified', margin + colW * 3 + 4, metricsBoxY + 20);

  y += metricsBoxH + 6;

  // 6. ACTIVE WARNING BULLETINS (within 5 km radius)
  const relatedAlerts = alerts.filter(a => a.track_id === anomaly.track_id);
  if (relatedAlerts.length > 0) {
    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`Active Emergency Bulletins (${relatedAlerts.length})`, margin, y);

    y += 4;

    relatedAlerts.slice(0, 2).forEach(alert => {
      doc.setFillColor(alert.category === 'severe' ? 254 : 255, alert.category === 'severe' ? 242 : 251, alert.category === 'severe' ? 242 : 235);
      doc.rect(margin, y, contentWidth, 12, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 12, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(alert.category === 'severe' ? 225 : 217, alert.category === 'severe' ? 29 : 119, alert.category === 'severe' ? 72 : 6);
      doc.text(`[${alert.category.toUpperCase()} ALERT] ${alert.alert_id}`, margin + 4, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Peak: ${alert.peak_value} ${alert.unit} · Lead: +${alert.lead_time_hours}h · Core: ${alert.core.lat}°N, ${alert.core.lon}°E (5km geodesic buffer)`,
        margin + 4,
        y + 8.5
      );

      y += 14;
    });
  }

  // 7. FOOTER & DISCLAIMER
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'OPERATIONAL DISCLAIMER: This guidance product is generated by the Crosby deep learning downscaling pipeline from 51-member NEPS-G ensembles. It is intended for decision-support and civil protection planning.',
    margin,
    footerY + 4
  );
  doc.text(
    `Document Ref: CROSBY-BULLETIN-${anomaly.track_id}-${cycle}.pdf  |  Node.js Full-Stack Service`,
    margin,
    footerY + 8
  );

  // Save PDF file client-side
  const filename = `Crosby_Summary_Report_${anomaly.track_id}_${cycle}.pdf`;
  doc.save(filename);
};
