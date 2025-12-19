const { google } = require('googleapis');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const MASTER_TAB_NAME = 'Master Tasks';
const CONTRACTORS_TAB_NAME = 'Contractors';

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
  // Days Old will be calculated by formula, so we leave it empty for now
  // Formula will be: =IF(A2="","",ROUNDDOWN((TODAY()-DATEVALUE(A2)),0))
  const row = [
    timestamp,
    '', // Days Old - will be filled by formula
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
      appendRow(`${MASTER_TAB_NAME}!A:N`),
      appendRow(`${taskData.project}!A:N`),
    ]);

    // Apply formula for Days Old after row is added
    await Promise.all([
      applyRowFormatting(auth, MASTER_TAB_NAME),
      applyRowFormatting(auth, taskData.project),
    ]);

    return { success: true, taskId: timestamp };
  } catch (error) {
    if (error.message.includes('Requested entity was not found')) {
      throw new Error(`Google Sheet not found. Check: 1) Sheet ID is correct (current: ${SPREADSHEET_ID}), 2) Sheet is shared with service account email, 3) Sheet exists. Original error: ${error.message}`);
    }
    throw error;
  }
}

async function ensureContractorsTabExists(auth) {
  const sheetsClient = sheets.spreadsheets;
  
  try {
    const spreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
    const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);
    
    if (existingTabs.includes(CONTRACTORS_TAB_NAME)) {
      // Check if headers exist
      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONTRACTORS_TAB_NAME}!A1:D1`,
      });
      
      if (!response.data.values || response.data.values.length === 0) {
        // Headers don't exist, add them
        const headers = ['Contractor Name', 'Email', 'Phone', 'Trade'];
        await sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: SPREADSHEET_ID,
          range: `${CONTRACTORS_TAB_NAME}!A1:D1`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [headers] },
        });
      }
      return;
    }

    // Create Contractors tab
    await sheetsClient.batchUpdate({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{ addSheet: { properties: { title: CONTRACTORS_TAB_NAME } } }],
      },
    });

    const headers = ['Contractor Name', 'Email', 'Phone', 'Trade'];
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${CONTRACTORS_TAB_NAME}!A1:D1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] },
    });

    // Format headers
    const updatedSpreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
    const sheetId = updatedSpreadsheet.data.sheets.find(s => s.properties.title === CONTRACTORS_TAB_NAME).properties.sheetId;
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
    console.error('Error ensuring Contractors tab exists:', error);
    // Don't throw - this is not critical
  }
}

async function ensureProjectTabExists(auth, projectName) {
  const sheetsClient = sheets.spreadsheets;
  
  try {
    // Ensure Contractors tab exists first
    await ensureContractorsTabExists(auth);
    
    const spreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
    const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);
    
    if (existingTabs.includes(projectName)) {
      // Check if headers need updating
      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SPREADSHEET_ID,
        range: `${projectName}!A1:N1`,
      });
      
      if (!response.data.values || response.data.values[0]?.length < 14) {
        // Headers need updating
        await setupSheetHeaders(auth, projectName);
      }
      return;
    }

    await sheetsClient.batchUpdate({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{ addSheet: { properties: { title: projectName } } }],
      },
    });

    await setupSheetHeaders(auth, projectName);
    await setupSheetFormatting(auth, projectName);
  } catch (error) {
    if (error.message.includes('Requested entity was not found')) {
      throw new Error(`Google Sheet not found. Check: 1) Sheet ID is correct (${SPREADSHEET_ID}), 2) Sheet is shared with service account email, 3) Sheet exists. Original error: ${error.message}`);
    }
    throw error;
  }
}

async function setupSheetHeaders(auth, sheetName) {
  const headers = ['Timestamp', 'Days Old', 'Project', 'Area', 'Trade', 'Task Title', 'Task Details', 'Assigned To', 'Priority', 'Due Date', 'Photo Needed', 'Status', 'Photo URL', 'Notes'];
  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:N1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [headers] },
  });
}

async function setupSheetFormatting(auth, sheetName) {
  const sheetsClient = sheets.spreadsheets;
  const spreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
  const sheetId = spreadsheet.data.sheets.find(s => s.properties.title === sheetName).properties.sheetId;
  
  const requests = [];
  
  // Format header row
  requests.push({
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
  });
  
  // Data validation for Status column (column L, index 11)
  requests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1, // Start from row 2 (0-indexed, so 1)
        endRowIndex: 1000, // Up to row 1000
        startColumnIndex: 11, // Column L (Status)
        endColumnIndex: 12,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'Open' },
            { userEnteredValue: 'In Progress' },
            { userEnteredValue: 'Closed' },
          ],
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  
  // Data validation for Assigned To column (column H, index 7) - pull from Contractors tab
  requests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: 7, // Column H (Assigned To)
        endColumnIndex: 8,
      },
      rule: {
        condition: {
          type: 'ONE_OF_RANGE',
          values: [{
            userEnteredValue: `=${CONTRACTORS_TAB_NAME}!A2:A1000`, // Contractor names from Contractors tab
          }],
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  
  // Conditional formatting for Status column (green for Closed, red for Open)
  // Green for Closed
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{
          sheetId,
          startRowIndex: 1,
          endRowIndex: 1000,
          startColumnIndex: 11, // Status column
          endColumnIndex: 12,
        }],
        booleanRule: {
          condition: {
            type: 'TEXT_EQ',
            values: [{ userEnteredValue: 'Closed' }],
          },
          format: {
            backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 }, // Light green
          },
        },
      },
      index: 0,
    },
  });
  
  // Red for Open
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{
          sheetId,
          startRowIndex: 1,
          endRowIndex: 1000,
          startColumnIndex: 11, // Status column
          endColumnIndex: 12,
        }],
        booleanRule: {
          condition: {
            type: 'TEXT_EQ',
            values: [{ userEnteredValue: 'Open' }],
          },
          format: {
            backgroundColor: { red: 0.95, green: 0.85, blue: 0.85 }, // Light red
          },
        },
      },
      index: 1,
    },
  });
  
  // Sort by Days Old (oldest first) - this will be applied to the entire data range
  // Note: We'll set up a filter view for this instead of sorting the data directly
  // as sorting can interfere with new data additions
  
  await sheetsClient.batchUpdate({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests },
  });
  
  // Set up formula for Days Old column (column B, index 1)
  // Formula handles ISO timestamps (2025-12-17T20:55:06.116Z) by extracting date part
  // Formula: =IF(A2="","",ROUNDDOWN((TODAY()-DATEVALUE(LEFT(A2,10))),0))
  // This extracts YYYY-MM-DD from ISO timestamp before the 'T'
  
  // Get current row count to apply formula
  const valuesResponse = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  
  const rowCount = (valuesResponse.data.values || []).length;
  if (rowCount > 1) {
    // Apply formula to existing rows
    const formulas = [];
    for (let i = 2; i <= rowCount; i++) {
      // Extract date part (first 10 characters: YYYY-MM-DD) from ISO timestamp
      formulas.push([`=IF(A${i}="","",ROUNDDOWN((TODAY()-DATEVALUE(LEFT(A${i},10))),0))`]);
    }
    
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!B2:B${rowCount}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: formulas },
    });
  }
}

async function applyRowFormatting(auth, projectName) {
  try {
    // Get the last row number
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${projectName}!A:A`,
    });
    
    const rowCount = (response.data.values || []).length;
    if (rowCount < 2) return; // No data rows yet
    
    const lastRow = rowCount;
    
    // Apply Days Old formula to the new row
    // Extract date part (first 10 characters: YYYY-MM-DD) from ISO timestamp
    const formula = `=IF(A${lastRow}="","",ROUNDDOWN((TODAY()-DATEVALUE(LEFT(A${lastRow},10))),0))`;
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${projectName}!B${lastRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[formula]] },
    });
  } catch (error) {
    console.error('Error applying row formatting:', error);
    // Don't throw - this is not critical
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
      range: `${MASTER_TAB_NAME}!A:N`,
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
  const auth = await getSheetsClient();
  await ensureProjectTabExists(auth, projectName);
  return { success: true, message: `Project tab '${projectName}' created successfully` };
}

async function initializeMasterTab() {
  const auth = await getSheetsClient();
  const sheetsClient = sheets.spreadsheets;
  
  try {
    // Ensure Contractors tab exists first
    await ensureContractorsTabExists(auth);
    
    const spreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
    const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);
    
    if (!existingTabs.includes(MASTER_TAB_NAME)) {
      // Create Master Tasks tab
      await sheetsClient.batchUpdate({
        auth,
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{ addSheet: { properties: { title: MASTER_TAB_NAME } } }],
        },
      });
    }
    
    // Setup headers and formatting for Master Tasks tab
    await setupSheetHeaders(auth, MASTER_TAB_NAME);
    await setupSheetFormatting(auth, MASTER_TAB_NAME);
    
    return { success: true, message: 'Master tab and Contractors tab initialized successfully' };
  } catch (error) {
    console.error('Error initializing Master tab:', error);
    throw error;
  }
}

async function addContractor(contractorData) {
  const auth = await getSheetsClient();
  
  try {
    await ensureContractorsTabExists(auth);
    
    const row = [
      contractorData.name || '',
      contractorData.email || '',
      contractorData.phone || '',
      contractorData.trade || '',
    ];
    
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${CONTRACTORS_TAB_NAME}!A:D`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] },
    });
    
    return { success: true, message: `Contractor '${contractorData.name}' added successfully` };
  } catch (error) {
    console.error('Error adding contractor:', error);
    throw error;
  }
}

module.exports = {
  addTaskToSheets,
  getTasks,
  getSubcontractorTasks,
  createProjectTab,
  initializeMasterTab,
  ensureContractorsTabExists,
  addContractor,
};


