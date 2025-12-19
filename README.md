# Legendary Homes Task Management

AI-powered task management system that converts natural language input into structured Google Sheets tasks.

## Quick Start

**For non-technical users:** See [SETUP.md](SETUP.md) for a complete step-by-step guide.

**For developers:**
1. Install dependencies: `npm install`
2. Set environment variables
3. Deploy to Vercel: `vercel`

## Environment Variables

- `GOOGLE_SHEET_ID` - Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Service account JSON (string or file path)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email config (optional)

## API Endpoints

- `POST /api/tasks` - Add a new task
- `GET /api/tasks` - Get tasks with filters
- `GET /api/subcontractor/:assignedTo` - Get subcontractor tasks
- `POST /api/projects` - Create project tab
- `POST /api/emails/weekly` - Send weekly emails

## Documentation

- [SETUP.md](SETUP.md) - Complete setup guide for non-technical users
- [TEST_POST.md](TEST_POST.md) - How to test POST /api/tasks endpoint
- `custom-gpt-config.json` - Custom GPT configuration
- `openapi.json` - OpenAPI schema for Custom GPT Actions
