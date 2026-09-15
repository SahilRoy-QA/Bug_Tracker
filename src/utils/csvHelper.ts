import { DefectItem, ProjectMeta } from '../types.ts';

export function exportDefectsToCSV(projectMeta: ProjectMeta, defects: DefectItem[]) {
  const openCount = defects.filter(d => d.defectStatus === 'Open').length;
  const inProgressCount = defects.filter(d => d.defectStatus === 'In Progress').length;
  const doubtCount = defects.filter(d => d.defectStatus === 'Doubt').length;
  const resolvedCount = defects.filter(d => ['Resolved', 'Verified', 'Closed'].includes(d.defectStatus)).length;

  const lines: string[] = [
    'Defect Status & Tracking Report,,,,,,,,,,,,,,,',
    '',
    `Total Defects,,,Open,,,Resolved/Closed,${resolvedCount}`,
    `${defects.length},,,${openCount},,,,Doubt,${doubtCount}`,
    `,,,,,,,In Progress,${inProgressCount}`,
    '',
    `Project Name,,${projectMeta.projectName}`,
    `Project Link,,${projectMeta.projectLink || ''}`,
    `Tag,,${projectMeta.tag || ''}`,
    `Build Version,,${projectMeta.version || '6.0.2'}`,
    `Build Revision,,${projectMeta.revision || '2611'}`,
    `Assigned QA Members,,${projectMeta.assignedQAMembers.join('; ')}`,
    `Estimated Start Date ,,${projectMeta.estimatedStartDate}`,
    `Estimated End Date ,,${projectMeta.estimatedEndDate}`,
    '',
    'DEFECT TRACKER SHEET DATABASE,,,,,,,,,,,,,,,',
    'Bug ID,Test Case ID,Defect Title,Defect Summary,Module,Defect Status,Severity,Priority,Assignee,Reporter,Environment,Expected Result,Actual Result,Drive Link,GitHub Link,Created Date,Updated Date'
  ];

  for (const d of defects) {
    const row = [
      escapeCSV(d.bugId),
      escapeCSV(d.testCaseId),
      escapeCSV(d.title),
      escapeCSV(d.summary || ''),
      escapeCSV(d.module),
      escapeCSV(d.defectStatus),
      escapeCSV(d.severity),
      escapeCSV(d.priority),
      escapeCSV(d.assignedTo),
      escapeCSV(d.reportedBy),
      escapeCSV(d.environment),
      escapeCSV(d.expectedResult || ''),
      escapeCSV(d.actualResult || ''),
      escapeCSV(d.driveLink || ''),
      escapeCSV(d.githubLink || ''),
      escapeCSV(d.createdDate),
      escapeCSV(d.updatedDate)
    ].join(',');
    lines.push(row);
  }

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${projectMeta.projectName.replace(/\s+/g, '_')}_Defect_Tracker_Sheet_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSV(val: string): string {
  if (!val) return '""';
  const clean = String(val).replace(/"/g, '""');
  return `"${clean}"`;
}

export function parseCSVToDefects(csvText: string): Partial<DefectItem>[] {
  const lines = csvText.split(/\r?\n/);
  const defects: Partial<DefectItem>[] = [];

  let isSplitTitleSummary = false;
  let headerIndex = -1;
  let hasExecutionStatusColumn = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Bug ID')) {
      headerIndex = i;
      if (lines[i].includes('Defect Title') && lines[i].includes('Defect Summary')) {
        isSplitTitleSummary = true;
      }
      if (lines[i].includes('Execution Status')) {
        hasExecutionStatusColumn = true;
      }
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser supporting quotes
    const cells = parseCSVLine(line);
    if (cells.length < 3) continue;

    const bugId = cells[0] || `BUG-IMP-${Date.now()}-${i}`;
    const testCaseId = cells[1] || '';
    const title = cells[2] || 'Imported Defect';
    const summary = isSplitTitleSummary ? (cells[3] || '') : '';
    let colIdx = isSplitTitleSummary ? 4 : 3;

    const module = cells[colIdx++] || 'General';
    
    // If old CSV contains execution status column, skip it or read it
    if (hasExecutionStatusColumn) {
      colIdx++; // skip Execution Status
    }

    const rawDefectStatus = cells[colIdx++];
    const defectStatus = (['Open', 'In Progress', 'Doubt', 'Resolved', 'Verified', 'Closed', 'Reopened'].includes(rawDefectStatus) ? rawDefectStatus : 'Open') as any;
    const severity = (['Critical', 'High', 'Medium', 'Low'].includes(cells[colIdx]) ? cells[colIdx++] : 'Medium') as any;
    const priority = (cells[colIdx++] || 'P3 - Medium') as any;
    const assignedTo = cells[colIdx++] || 'Unassigned';
    const reportedBy = cells[colIdx++] || 'QA Engineer';
    const environment = cells[colIdx++] || 'QA Staging';
    const expectedResult = cells[colIdx++] || '';
    const actualResult = cells[colIdx++] || '';
    const driveLink = cells[colIdx++] || '';
    const githubLink = cells[colIdx++] || '';

    defects.push({
      id: `imported-${Date.now()}-${i}`,
      bugId,
      testCaseId,
      title,
      summary,
      module,
      defectStatus,
      severity,
      priority,
      assignedTo,
      reportedBy,
      environment,
      expectedResult,
      actualResult,
      driveLink,
      githubLink,
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0]
    });
  }

  return defects;
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
