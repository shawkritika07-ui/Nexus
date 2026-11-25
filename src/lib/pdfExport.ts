import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalysisResultRecord, DatasetRecord } from '../types/edna';

export function exportResultToCsv(result: AnalysisResultRecord) {
  const headers = [
    'Sequence ID',
    'Scientific Name',
    'Taxonomic Rank',
    'Taxonomic ID',
    'Reference Database',
    'Domain',
    'Kingdom',
    'Phylum',
    'Class',
    'Order',
    'Family',
    'Genus',
    'Species',
    'Similarity (%)',
    'Query Coverage (%)',
    'E-value',
    'Confidence',
    'Match Status',
    'Read Count',
    'Relative Abundance (%)',
  ];

  const rows = result.taxaAssignments.map((t) => [
    t.sequenceId,
    t.scientificName,
    t.taxonomicRank,
    t.taxonomicId,
    t.referenceDatabase,
    t.lineage.domain,
    t.lineage.kingdom,
    t.lineage.phylum,
    t.lineage.class,
    t.lineage.order,
    t.lineage.family,
    t.lineage.genus,
    t.lineage.species,
    t.similarityPercentage.toFixed(2),
    t.queryCoverage.toFixed(1),
    t.eValue,
    t.confidence,
    t.matchStatus,
    String(t.readCount),
    t.relativeAbundance.toFixed(2),
  ]);

  const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${result.datasetName.replace(/[^a-zA-Z0-9_-]/g, '_')}_taxonomic_results.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportResultToPdf(
  result: AnalysisResultRecord,
  dataset: DatasetRecord | undefined,
  reportTitle: string
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, pageWidth, 84, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('eDNA Explorer — Scientific Biodiversity Report', 40, 36);
  doc.setFontSize(10);
  doc.text(`Project / Report: ${reportTitle}`, 40, 56);
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)} | Mode: ${result.pipelineMode}`, 40, 70);

  let y = 108;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(13);
  doc.text('1. Dataset & Sampling Information', 40, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [20, 83, 45], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 5 },
    head: [['Attribute', 'Value', 'Attribute', 'Value']],
    body: [
      ['Dataset Name', result.datasetName, 'Sample ID', dataset?.sampleId || 'N/A'],
      ['Sample Type', dataset?.sampleType || 'N/A', 'File Format', dataset?.fileFormat || 'N/A'],
      ['Location', dataset?.collectionLocation || 'Not specified', 'Collection Date', dataset?.collectionDate || 'Not specified'],
      ['Analysis Type', result.analysisType, 'Reference Database', result.referenceDatabase],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  doc.setFontSize(13);
  doc.text('2. Methodology & Pipeline Provenance', 40, y);
  y += 14;
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const methodLines = doc.splitTextToSize(
    `Sequences were parsed for read count, length distribution, and GC content prior to taxonomic assignment against ${result.referenceDatabase}. Diversity metrics were calculated from classified taxon abundances (n_i). ${result.disclaimer}`,
    pageWidth - 80
  );
  doc.text(methodLines, 40, y);
  y += methodLines.length * 12 + 14;

  doc.setTextColor(16, 42, 67);
  doc.setFontSize(13);
  doc.text('3. Biodiversity Metrics Summary', 40, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 5 },
    head: [['Metric', 'Value', 'Ecological Interpretation']],
    body: [
      ['Species Richness (S)', String(result.speciesRichness), 'Count of distinct classified taxa'],
      ['Shannon Diversity (H\')', result.shannonIndex.toFixed(4), 'Combines richness and evenness (higher = more diverse)'],
      ['Simpson Diversity (1 - D)', result.simpsonIndex.toFixed(4), 'Probability two random reads belong to different taxa'],
      ['Pielou\'s Evenness (J\')', result.pielouEvenness.toFixed(4), 'Equitability of abundance across taxa (0 to 1)'],
      ['Total / Classified Reads', `${result.totalReads} / ${result.classifiedReads}`, 'Read retention after quality/similarity thresholds'],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  if (y > 680) {
    doc.addPage();
    y = 48;
  }

  doc.setTextColor(16, 42, 67);
  doc.setFontSize(13);
  doc.text('4. Taxonomic Identification Results (Top Taxa)', 40, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [20, 83, 45], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 4 },
    head: [['Scientific Name', 'Phylum', 'Rank', 'Taxon ID', 'Sim %', 'E-value', 'Reads', 'Abund %', 'Status']],
    body: result.taxaAssignments.slice(0, 30).map((t) => [
      t.scientificName,
      t.lineage.phylum,
      t.taxonomicRank,
      t.taxonomicId,
      `${t.similarityPercentage.toFixed(1)}%`,
      t.eValue,
      String(t.readCount),
      `${t.relativeAbundance.toFixed(2)}%`,
      t.matchStatus,
    ]),
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  if (y > 680) {
    doc.addPage();
    y = 48;
  }

  // Relative abundance bar visual directly in PDF
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(13);
  doc.text('5. Taxonomic Distribution Chart', 40, y);
  y += 16;
  const topBars = result.taxaAssignments.slice(0, 6);
  for (const item of topBars) {
    if (y > 750) {
      doc.addPage();
      y = 48;
    }
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(item.scientificName.slice(0, 32), 40, y);
    const barMax = pageWidth - 250;
    const barW = Math.max(4, (item.relativeAbundance / 100) * barMax);
    doc.setFillColor(220, 252, 231);
    doc.rect(195, y - 8, barMax, 10, 'F');
    doc.setFillColor(22, 163, 74);
    doc.rect(195, y - 8, barW, 10, 'F');
    doc.text(`${item.relativeAbundance.toFixed(1)}%`, pageWidth - 46, y);
    y += 16;
  }

  y += 10;
  if (y > 670) {
    doc.addPage();
    y = 48;
  }

  doc.setTextColor(16, 42, 67);
  doc.setFontSize(13);
  doc.text('6. Limitations, Conclusion & Scientific Disclaimer', 40, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const conclusionText =
    (result.aiInterpretation ? `AI-Assisted Summary: ${result.aiInterpretation.replace(/\n+/g, ' ')}\n\n` : '') +
    `Limitations: eDNA detectability depends on primer specificity, PCR bias, environmental degradation rates, and reference database completeness (${result.referenceDatabase}). ${result.dataValidityWarning || ''}\n` +
    `Disclaimer: ${result.disclaimer}`;
  const wrapped = doc.splitTextToSize(conclusionText, pageWidth - 80);
  doc.text(wrapped, 40, y);

  doc.save(`${result.datasetName.replace(/[^a-zA-Z0-9_-]/g, '_')}_eDNA_Report.pdf`);
}
