# Setup Guide - Legendary Homes Task Management

This guide will walk you through setting up the task management system from scratch. Plan for about 30-45 minutes.

## What You'll Need

- A Google account
- A ChatGPT Plus subscription (for Custom GPT)
- A computer with internet access
- Basic familiarity with Google Sheets

## Step 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it something like "Legendary Homes Tasks" or "Jobsite Tasks"
3. Rename the first tab to **"Master Tasks"** (right-click the tab → Rename)
4. In row 1, add these headers (one per column):
   - Timestamp
   - Project
   - Area
   - Trade
   - Task Title
   - Task Details
   - Assigned To
   - Priority
   - Due Date
   - Photo Needed
   - Status
   - Photo URL
   - Notes

5. Make row 1 bold and give it a background color (optional, but helps)
6. Copy the Sheet ID from the URL. It's the long string between `/d/` and `/edit`. For example:
   ```
   https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/d/edit
                                                      ↑ This part ↑
   ```
   Save this Sheet ID somewhere - you'll need it later.

## Step 2: Set Up Google Cloud

This gives the system permission to write to your Google Sheet.

### 2.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top (next to "Google Cloud")
3. Click "New Project"
4. Name it "Legendary Homes Tasks" (or whatever you prefer)
5. Click "Create"
6. Wait a few seconds, then select this new project from the dropdown

### 2.2 Enable Google Sheets API

1. In the search bar at the top, type "Google Sheets API"
2. Click on "Google Sheets API"
3. Click the blue "Enable" button
4. Wait for it to enable (usually 10-20 seconds)

### 2.3 Create a Service Account

1. In the left sidebar, go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" at the top
3. Select "Service Account"
4. Fill in:
   - Service account name: "task-manager" (or any name)
   - Service account ID: will auto-fill
   - Click "Create and Continue"
5. Skip the optional steps (click "Continue" then "Done")

### 2.4 Create and Download the Key

1. You should now see your service account in the list. Click on it (the email address)
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create"
6. A file will download automatically - this is your service account key
7. **Important:** Keep this file safe. Don't share it publicly or commit it to version control.

### 2.5 Share Your Google Sheet with the Service Account

1. Open the JSON file you just downloaded
2. Find the field called `"client_email"` - it looks like: `"client_email": "task-manager@your-project.iam.gserviceaccount.com"`
3. Copy that entire email address
4. Go back to your Google Sheet
5. Click the green "Share" button in the top right
6. Paste the service account email address
7. Make sure it has "Editor" permissions
8. Uncheck "Notify people" (the service account doesn't need notifications)
9. Click "Share"

## Step 3: Deploy to Vercel

Vercel is where your API will live. It's free for this use case.

### 3.1 Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with your GitHub account (or create one if needed - it's free)

### 3.2 Install Vercel CLI

1. Go to [vercel.com/download](https://vercel.com/download)
2. Download and install the Vercel CLI for your operating system
3. Open Terminal (Mac) or Command Prompt (Windows)
4. Verify it's installed by typing: `vercel --version`
   - If you get an error, you may need to restart your terminal

### 3.3 Deploy Your Project

1. Open Terminal/Command Prompt
2. Navigate to your project folder:
   ```bash
   cd /path/to/your/project
   ```
   (Replace with your actual project path)

3. Log in to Vercel:
   ```bash
   vercel login
   ```
   Follow the prompts in your browser

4. Deploy:
   ```bash
   vercel
   ```
   - When asked "Set up and deploy?", type `Y` and press Enter
   - When asked "Which scope?", select your account
   - When asked "Link to existing project?", type `N` and press Enter
   - When asked "What's your project's name?", press Enter (uses default)
   - When asked "In which directory is your code located?", press Enter (uses `./`)
   - It will detect your settings automatically

5. After deployment, you'll get a URL like: `https://your-project.vercel.app`
   - Save this URL - you'll need it for the Custom GPT setup

### 3.4 Add Environment Variables

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to "Settings" → "Environment Variables"
4. Add these variables one by one:

   **GOOGLE_SHEET_ID**
   - Name: `GOOGLE_SHEET_ID`
   - Value: The Sheet ID you copied in Step 1
   - Environment: Production, Preview, Development (check all three)

   **GOOGLE_SERVICE_ACCOUNT_KEY**
   - Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Value: Open the JSON file you downloaded in Step 2.4, copy the ENTIRE contents (all of it, including the curly braces)
   - Environment: Production, Preview, Development (check all three)

   **Optional - Email Settings** (only if you want email automation):
   - `SMTP_HOST` - Your email provider's SMTP server (e.g., `smtp.brevo.com`)
   - `SMTP_PORT` - Usually `587` or `465`
   - `SMTP_USER` - Your SMTP username
   - `SMTP_PASSWORD` - Your SMTP password
   - `FROM_EMAIL` - The email address to send from

5. After adding all variables, go to "Deployments"
6. Click the three dots (⋯) on your latest deployment
7. Click "Redeploy" to apply the new environment variables

## Step 4: Set Up Custom GPT

This connects ChatGPT to your API.

### 4.1 Create the Custom GPT

1. Go to [chat.openai.com](https://chat.openai.com)
2. Make sure you're on a ChatGPT Plus plan
3. Click your name in the bottom left → "My GPTs"
4. Click "Create a GPT"
5. Click "Configure" tab (not "Create")

### 4.2 Basic Information

1. **Name:** Legendary Homes Task Manager
2. **Description:** Manages construction tasks and saves them to Google Sheets
3. **Instructions:** Copy from `custom-gpt-config.json` file, section "instructions"

### 4.3 Add Actions (API Integration)

1. Scroll down to "Actions"
2. Click "Create new action"
3. You have two options:

   **Option A: Import from file (Easier)**
   - In your project folder, open the file `openapi.json`
   - Find the line that says `"url": "https://your-project.vercel.app"`
   - Replace `your-project.vercel.app` with your actual Vercel URL (from Step 3.3)
   - Save the file
   - In Custom GPT, click "Import from URL" or "Upload file"
   - Upload the `openapi.json` file

   **Option B: Manual setup**
   - Click "Create new action"
   - Fill in:
     - **Name:** `add_task_to_sheets`
     - **Description:** Adds a new task to Google Sheets
     - **Method:** POST
     - **URL:** `https://your-project.vercel.app/api/tasks` (replace with your Vercel URL)
   - Under "Parameters", add each field:
     - project (string, required)
     - taskTitle (string, required)
     - trade (string, required)
     - assignedTo (string, required)
     - area (string, optional)
     - taskDetails (string, optional)
     - priority (string, optional - values: Low, Medium, High, Urgent)
     - dueDate (string, optional)
     - photoNeeded (boolean, optional)

4. Click "Save" in the top right

### 4.4 Test Your Custom GPT

1. Go back to the "Preview" tab
2. Try saying: "Add a test task: Grandin project, kitchen tile work, assign to Tile, due Friday"
3. The GPT should call your API and add the task to your Google Sheet
4. Check your Google Sheet to confirm the task appeared

## Step 5: Test Everything

1. **Test adding a task:**
   - Tell your Custom GPT: "Grandin job - rear retaining wall - chipped block - assign to Masonry - due Friday - photo needed"
   - Check your Google Sheet - the task should appear in both "Master Tasks" and a "Grandin" tab

2. **Test getting tasks:**
   - Ask: "Show me all tasks for Masonry"
   - The GPT should retrieve and display tasks

3. **Test creating a project:**
   - Say: "Create a new project called Maple Street"
   - Check your Google Sheet - a new "Maple Street" tab should appear

## Troubleshooting

**Tasks aren't appearing in Google Sheet:**
- Check that you shared the sheet with the service account email
- Verify the Sheet ID is correct in environment variables
- Check Vercel deployment logs for errors

**Custom GPT can't connect:**
- Verify your Vercel URL is correct
- Make sure the deployment succeeded
- Check that environment variables are set in Vercel

**API errors:**
- Go to Vercel dashboard → Your project → Deployments → Click on a deployment → View "Functions" tab for error logs

**Service account key issues:**
- Make sure you copied the ENTIRE JSON file contents
- Verify there are no extra spaces or line breaks
- The JSON should start with `{` and end with `}`

## Next Steps

Once everything is working:
- Train your team on how to use the Custom GPT
- Set up weekly email automation (optional, requires email configuration)
- Customize trade names, priorities, or other settings as needed

## Getting Help

If you run into issues:
1. Check the Vercel deployment logs
2. Check Google Cloud Console for API errors
3. Verify all environment variables are set correctly
4. Make sure your Google Sheet is shared with the service account

That's it! Your system should now be fully operational.

