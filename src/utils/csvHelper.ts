import { DefectItem, ProjectMeta } from '../types.ts';

export function exportDefectsToCSV(projectMeta: ProjectMeta, defects: DefectItem[]) {
  const passed = defects.filter(d => d.testExecutionStatus === 'Passed').length;
  const failed = defects.filter(d => d.testExecutionStatus === 'Failed').length;
  const blocked = defects.filter(d => d.testExecutionStatus === 'Blocked').length;
  const pending = defects.filter(d => d.testExecutionStatus === 'Pending').length;

  const lines: string[] = [
    'Test Execution Status Report,,,,,,,,,,,,,,,,',
    '',
    `Total Executed,,,Passed,,,Passed,${passed}`,
    `${defects.length},,,${passed},,,,Failed,${failed}`,
    `,,,,,,,Blocked,${blocked}`,
    `Failed,,,Blocked,,,,Pending,${pending}`,
    `${failed},,,${blocked},,,,,`,
    '',
    `Project Name,,${projectMeta.projectName}`,
    `Project Link,,${projectMeta.projectLink}`,
    `Assigned QA Members,,${projectMeta.assignedQAMembers.join('; ')}`,
    `Estimated Start Date ,,${projectMeta.estimatedStartDate}`,
    `Estimated End Date ,,${projectMeta.estimatedEndDate}`,
    `Drive Link,,${projectMeta.driveLink}`,
    `Github Repository Link,,${projectMeta.githubRepoLink}`,
    '',
    'DEFECT TRACKER SHEET DATABASE,,,,,,,,,,,,,,,,',
    'Bug ID,Test Case ID,Summary / Title,Module,Execution Status,Defect Status,Severity,Priority,Assignee,Reporter,Environment,Expected Result,Actual Result,Drive Link,GitHub Link,Created Date,Updated Date'
  ];

  for (const d of defects) {
    const row = [
      escapeCSV(d.bugId),
      escapeCSV(d.testCaseId),
      escapeCSV(d.title),
      escapeCSV(d.module),
      escapeCSV(d.testExecutionStatus),
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

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Bug ID') && lines[i].includes('Summary')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    // Attempt parsing from first line if header contains bugId
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
    const module = cells[3] || 'General';
    const testExecutionStatus = (['Passed', 'Failed', 'Blocked', 'Pending'].includes(cells[4]) ? cells[4] : 'Pending') as any;
    const defectStatus = (['Open', 'In Progress', 'Resolved', 'Verified', 'Closed', 'Reopened'].includes(cells[5]) ? cells[5] : 'Open') as any;
    const severity = (['Critical', 'High', 'Medium', 'Low'].includes(cells[6]) ? cells[6] : 'Medium') as any;
    const priority = (cells[7] || 'P3 - Medium') as any;
    const assignedTo = cells[8] || 'Unassigned';
    const reportedBy = cells[9] || 'QA Engineer';
    const environment = cells[10] || 'QA Staging';
    const expectedResult = cells[11] || '';
    const actualResult = cells[12] || '';
    const driveLink = cells[13] || '';
    const githubLink = cells[14] || '';

    defects.push({
      id: `imported-${Date.now()}-${i}`,
      bugId,
      testCaseId,
      title,
      module,
      testExecutionStatus,
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
