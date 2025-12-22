# Task Management System

A simple system that manages construction tasks in Google Sheets and sends weekly email summaries to contractors.

## What This Does

- Stores all tasks in a Google Sheet
- Automatically sends weekly email summaries to contractors
- Organizes tasks by project
- Tracks task status, priority, and due dates

## Setup Guide

Follow these steps to get everything working. You don't need any coding knowledge.

### Step 1: Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name it (e.g., "Task Manager") and click "Create"
4. Wait for the project to be created, then select it

5. Go to "APIs & Services" → "Library"
6. Search for "Google Sheets API" and click "Enable"
7. Search for "Google Drive API" and click "Enable"

8. Go to "APIs & Services" → "Credentials"
9. Click "Create Credentials" → "Service Account"
10. Name it "task-manager" and click "Create and Continue"
11. Skip role assignment, click "Continue" then "Done"

12. Click on the service account you just created
13. Go to "Keys" tab → "Add Key" → "Create new key"
14. Choose "JSON" and click "Create"
15. A file will download - keep this file safe

### Step 2: Set Up Your Google Sheet

1. Create a new Google Sheet
2. Copy the Sheet ID from the URL:
   - URL looks like: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the part between `/d/` and `/edit`

3. Open the downloaded JSON file from Step 1
4. Find the `client_email` field (looks like `task-manager@...iam.gserviceaccount.com`)
5. Copy that email address

6. Go back to your Google Sheet
7. Click "Share" (top right)
8. Paste the service account email
9. Give it "Editor" access
10. Uncheck "Notify people" and click "Share"

### Step 3: Set Up Email (Optional)

If you want weekly emails sent to contractors, set up an email service.

#### Option A: Brevo (Recommended - Free)

1. Sign up at [brevo.com](https://www.brevo.com)
2. Go to Settings → SMTP & API
3. Click "SMTP Keys" tab
4. Click "Generate a new SMTP key"
5. Copy the SMTP key (starts with `xsmtpib-...`)
6. Note your Brevo email address (the one you signed up with)

#### Option B: Gmail

1. Enable 2-factor authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and your device
4. Click "Generate"
5. Copy the 16-character password

### Step 4: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New" → "Project"
3. Import your Git repository (or upload the project files)
4. Click "Deploy"

5. After deployment, go to Project Settings → Environment Variables
6. Add these variables:

**Required:**
- `GOOGLE_SHEET_ID` = Your Google Sheet ID from Step 2
- `GOOGLE_SERVICE_ACCOUNT_KEY` = Open the JSON file from Step 1, copy ALL the content, paste it here

**For Email (if using Brevo):**
- `SMTP_HOST` = `smtp.brevo.com`
- `SMTP_PORT` = `587`
- `SMTP_USER` = Your Brevo email address
- `SMTP_PASSWORD` = Your SMTP key from Step 3
- `FROM_EMAIL` = Your Brevo email address (same as SMTP_USER)
- `FROM_NAME` = `Legendary Homes Task Management`

**For Email (if using Gmail):**
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_USER` = Your Gmail address
- `SMTP_PASSWORD` = Your App Password from Step 3
- `FROM_EMAIL` = Your Gmail address
- `FROM_NAME` = `Legendary Homes Task Management`

7. Click "Save" and redeploy your project

### Step 5: Initialize the Sheet

1. After deployment, copy your Vercel URL (looks like `https://your-project.vercel.app`)
2. Open a new browser tab
3. Go to: `https://your-project.vercel.app/api/initialize`
4. You should see a success message

This creates the necessary tabs and formatting in your Google Sheet.

### Step 6: Add Contractors

1. Open your Google Sheet
2. Click the "Contractors" tab at the bottom
3. Add contractors in rows 2 and below:
   - Column A: Contractor Name (e.g., "ABC Plumbing")
   - Column B: Email Address (e.g., "abc@plumbing.com")
   - Column C: Phone (optional)
   - Column D: Trade (optional)

The system automatically uses these emails for weekly summaries.

### Step 7: Test It

1. Add a test task:
   - Go to: `https://your-project.vercel.app/api/tasks`
   - Use a tool like [Postman](https://www.postman.com) or [Hoppscotch](https://hoppscotch.io)
   - Method: POST
   - Body (JSON):
     ```json
     {
       "project": "Test Project",
       "taskTitle": "Test Task",
       "trade": "Plumbing",
       "assignedTo": "ABC Plumbing"
     }
     ```

2. Check your Google Sheet - the task should appear

3. Test weekly emails:
   - Go to: `https://your-project.vercel.app/api/emails/weekly`
   - Method: POST
   - If configured correctly, emails will be sent

## Using the System

### Adding Tasks

Send a POST request to `/api/tasks` with:
```json
{
  "project": "Project Name",
  "area": "Kitchen",
  "trade": "Plumbing",
  "taskTitle": "Fix leaky faucet",
  "taskDetails": "Kitchen sink faucet is leaking",
  "assignedTo": "ABC Plumbing",
  "priority": "High",
  "dueDate": "2024-02-15",
  "photoNeeded": true
}
```

### Getting Tasks

GET `/api/tasks?project=Project Name&status=Open`

### Updating Tasks

PUT `/api/tasks` with:
```json
{
  "taskId": "timestamp-from-sheet",
  "status": "Completed",
  "notes": "Fixed successfully"
}
```

### Weekly Emails

POST `/api/emails/weekly` - Sends emails to all contractors with open tasks

The system automatically reads contractor emails from the "Contractors" tab in your Google Sheet.

## Scheduling Weekly Emails

To automatically send emails every week:

1. Go to [cron-job.org](https://cron-job.org) (free)
2. Sign up for a free account
3. Click "Create cronjob"
4. Set:
   - Title: Weekly Contractor Emails
   - URL: `https://your-project.vercel.app/api/emails/weekly`
   - Schedule: Weekly (e.g., Every Monday at 9:00 AM)
   - Method: POST
5. Save

## Troubleshooting

**Tasks not appearing in sheet:**
- Check that the service account email has Editor access
- Verify GOOGLE_SHEET_ID is correct
- Make sure you ran `/api/initialize`

**Emails not sending:**
- Verify SMTP credentials are correct
- For Brevo: Make sure you're using the SMTP key, not your login password
- For Gmail: Make sure you're using an App Password, not your regular password
- Check spam folder

**Can't access API:**
- Make sure your Vercel project is deployed
- Check the URL is correct
- Verify environment variables are set

## Support

If you get stuck, check:
1. Vercel deployment logs (Project → Deployments → Click on a deployment → Functions)
2. Google Sheet permissions
3. Environment variables in Vercel

## API Endpoints

- `GET /health` - Check if system is running
- `POST /api/initialize` - Set up Google Sheet
- `POST /api/tasks` - Add task(s)
- `GET /api/tasks` - Get tasks (with optional filters)
- `PUT /api/tasks` - Update task
- `POST /api/contractors` - Add contractor
- `POST /api/projects` - Create project tab
- `POST /api/emails/weekly` - Send weekly emails
