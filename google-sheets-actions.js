const { google } = require('googleapis');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const MASTER_TAB_NAME = 'Master Tasks';

async function getSheetsClient() {
  const keyContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!keyContent) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  // If it's a JSON string (starts with {), parse it (for Vercel/serverless)
  if (keyContent.trim().startsWith('{')) {
    try {
      const keyData = JSON.parse(keyContent);
      return new google.auth.GoogleAuth({
        credentials: keyData,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (e) {
      throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY as JSON: ${e.message}. Make sure you pasted the entire JSON content, not a file path.`);
    }
  }

  // If it's a file path (for local development)
  // Remove ./ prefix if present, handle both ./file.json and file.json
  const fs = require('fs');
  const path = require('path');
  let filePath = keyContent.trim();
  
  // Remove ./ prefix if present
  if (filePath.startsWith('./')) {
    filePath = filePath.substring(2);
  }
  
  // Check if file exists (for local development)
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    return new google.auth.GoogleAuth({
      keyFile: fullPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  // If we're on Vercel/serverless and it's a file path, that won't work
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY is set to a file path (${keyContent}), but file paths don't work on serverless platforms. You need to paste the entire JSON content as a string in the environment variable.`);
  }

  // Last resort: try the path as-is
  return new google.auth.GoogleAuth({
    keyFile: filePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function addTaskToSheets(taskData) {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }

  const auth = await getSheetsClient();
  const timestamp = new Date().toISOString();
  const row = [
    timestamp,
    taskData.project || '',
    taskData.area || '',
    taskData.trade || '',
    taskData.taskTitle || '',
    taskData.taskDetails || '',
    taskData.assignedTo || '',
    taskData.priority || 'Medium',
    taskData.dueDate || '',
    taskData.photoNeeded ? 'Yes' : 'No',
    'Open',
    '',
    '',
  ];

  try {
    await ensureProjectTabExists(auth, taskData.project);

    const appendRow = async (range) => {
      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] },
      });
    };

    await Promise.all([
      appendRow(`${MASTER_TAB_NAME}!A:M`),
      appendRow(`${taskData.project}!A:M`),
    ]);

    return { success: true, taskId: timestamp };
  } catch (error) {
    if (error.message.includes('Requested entity was not found')) {
      throw new Error(`Google Sheet not found. Check: 1) Sheet ID is correct (current: ${SPREADSHEET_ID}), 2) Sheet is shared with service account email, 3) Sheet exists. Original error: ${error.message}`);
    }
    throw error;
  }
}

async function ensureProjectTabExists(auth, projectName) {
  const sheetsClient = sheets.spreadsheets;
  
  try {
    const spreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
    const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);
    
    if (existingTabs.includes(projectName)) return;

    await sheetsClient.batchUpdate({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{ addSheet: { properties: { title: projectName } } }],
      },
    });

    const headers = ['Timestamp', 'Project', 'Area', 'Trade', 'Task Title', 'Task Details', 'Assigned To', 'Priority', 'Due Date', 'Photo Needed', 'Status', 'Photo URL', 'Notes'];
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${projectName}!A1:M1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] },
    });

    const updatedSpreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
    const sheetId = updatedSpreadsheet.data.sheets.find(s => s.properties.title === projectName).properties.sheetId;
    await sheetsClient.batchUpdate({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.6 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        }],
      },
    });
  } catch (error) {
    if (error.message.includes('Requested entity was not found')) {
      throw new Error(`Google Sheet not found. Check: 1) Sheet ID is correct (${SPREADSHEET_ID}), 2) Sheet is shared with service account email, 3) Sheet exists. Original error: ${error.message}`);
    }
    throw error;
  }
}

async function getTasks(filters = {}) {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }

  const auth = await getSheetsClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${MASTER_TAB_NAME}!A:M`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const headers = rows[0];
    let tasks = rows.slice(1).map(row => {
      const task = {};
      headers.forEach((header, index) => {
        task[header.toLowerCase().replace(/\s+/g, '')] = row[index] || '';
      });
      return task;
    });

    if (filters.project) tasks = tasks.filter(t => t.project?.toLowerCase().includes(filters.project.toLowerCase()));
    if (filters.trade) tasks = tasks.filter(t => t.trade?.toLowerCase().includes(filters.trade.toLowerCase()));
    if (filters.assignedTo) tasks = tasks.filter(t => t.assignedto?.toLowerCase().includes(filters.assignedTo.toLowerCase()));
    if (filters.status) tasks = tasks.filter(t => t.status?.toLowerCase() === filters.status.toLowerCase());

    return tasks;
  } catch (error) {
    if (error.message.includes('Requested entity was not found')) {
      throw new Error(`Google Sheet not found. Check: 1) Sheet ID is correct (current: ${SPREADSHEET_ID}), 2) Sheet is shared with service account email, 3) Sheet exists and is accessible. Original error: ${error.message}`);
    }
    throw error;
  }
}

async function getSubcontractorTasks(assignedTo) {
  return getTasks({ assignedTo, status: 'Open' });
}

async function createProjectTab(projectName) {
  await ensureProjectTabExists(await getSheetsClient(), projectName);
  return { success: true, message: `Project tab '${projectName}' created successfully` };
}

module.exports = {
  addTaskToSheets,
  getTasks,
  getSubcontractorTasks,
  createProjectTab,
};


