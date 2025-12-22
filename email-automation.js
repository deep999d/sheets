const { getSubcontractorTasks, getContractorEmails } = require('./google-sheets-actions');
const nodemailer = require('nodemailer');

class EmailAutomation {
  constructor(config = {}) {
    const smtpUser = config.smtpUser || process.env.SMTP_USER;
    const fromEmail = config.fromEmail || process.env.FROM_EMAIL || smtpUser || 'tasks@legendaryhomes.com';
    
    this.config = {
      smtpHost: config.smtpHost || process.env.SMTP_HOST,
      smtpPort: config.smtpPort || process.env.SMTP_PORT || 587,
      smtpUser: smtpUser,
      smtpPassword: config.smtpPassword || process.env.SMTP_PASSWORD,
      fromEmail: fromEmail,
      fromName: config.fromName || process.env.FROM_NAME || 'Legendary Homes Task Management',
    };

    // Store config for contractor emails (fallback if sheet fetch fails)
    // Priority: config > env variable > empty (will fetch from sheet)
    if (config && config.subcontractorEmails) {
      this.subcontractorEmails = config.subcontractorEmails;
    } else if (process.env.CONTRACTOR_EMAILS) {
      try {
        this.subcontractorEmails = JSON.parse(process.env.CONTRACTOR_EMAILS);
      } catch (e) {
        console.warn('Failed to parse CONTRACTOR_EMAILS from environment variable:', e.message);
        this.subcontractorEmails = {};
      }
    } else {
      // Will be fetched from Google Sheets
      this.subcontractorEmails = {};
    }
  }

  generateEmailContent(tasks, subcontractorName) {
    if (!tasks || tasks.length === 0) {
      return {
        subject: `Weekly Task Summary - ${subcontractorName} - No Open Tasks`,
        html: this.generateNoTasksEmail(subcontractorName),
        text: this.generateNoTasksEmailText(subcontractorName),
      };
    }

    const taskList = tasks.map((task, index) => {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not specified';
      const priorityBadge = this.getPriorityBadge(task.priority);
      
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <strong>${index + 1}. ${task.taskTitle || 'Task'}</strong>
            ${priorityBadge}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 10px 10px 30px; border-bottom: 1px solid #ddd; color: #666;">
            <strong>Project:</strong> ${task.project || 'N/A'}<br>
            <strong>Area:</strong> ${task.area || 'N/A'}<br>
            <strong>Details:</strong> ${task.taskDetails || task.taskTitle || 'N/A'}<br>
            <strong>Due Date:</strong> ${dueDate}<br>
            <strong>Photo Needed:</strong> ${task.photoNeeded === 'Yes' ? '✓ Yes' : 'No'}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .task-table { width: 100%; background-color: white; border-collapse: collapse; margin-top: 20px; }
          .footer { margin-top: 20px; padding: 10px; text-align: center; color: #666; font-size: 12px; }
          .priority-badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px; }
          .priority-urgent { background-color: #e74c3c; color: white; }
          .priority-high { background-color: #e67e22; color: white; }
          .priority-medium { background-color: #f39c12; color: white; }
          .priority-low { background-color: #95a5a6; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Task Summary</h1>
            <p>${subcontractorName}</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Here is your weekly summary of open tasks from Legendary Homes:</p>
            <table class="task-table">
              ${taskList}
            </table>
            <p style="margin-top: 20px;">
              <strong>Total Open Tasks: ${tasks.length}</strong>
            </p>
            <p>Please review these tasks and update the status in the Google Sheet as you complete them.</p>
            <p>If you have any questions, please contact us directly.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from Legendary Homes Task Management System.</p>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = this.generateTextEmail(tasks, subcontractorName);

    return {
      subject: `Weekly Task Summary - ${subcontractorName} - ${tasks.length} Open Task${tasks.length !== 1 ? 's' : ''}`,
      html,
      text,
    };
  }

  generateTextEmail(tasks, subcontractorName) {
    let text = `Weekly Task Summary - ${subcontractorName}\n\n`;
    text += `You have ${tasks.length} open task(s):\n\n`;

    tasks.forEach((task, index) => {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not specified';
      text += `${index + 1}. ${task.taskTitle || 'Task'}\n`;
      text += `   Project: ${task.project || 'N/A'}\n`;
      text += `   Area: ${task.area || 'N/A'}\n`;
      text += `   Details: ${task.taskDetails || task.taskTitle || 'N/A'}\n`;
      text += `   Priority: ${task.priority || 'Medium'}\n`;
      text += `   Due Date: ${dueDate}\n`;
      text += `   Photo Needed: ${task.photoNeeded === 'Yes' ? 'Yes' : 'No'}\n\n`;
    });

    text += `\nGenerated on ${new Date().toLocaleDateString()}\n`;
    return text;
  }

  generateNoTasksEmail(subcontractorName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Task Summary</h1>
            <p>${subcontractorName}</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Great news! You have no open tasks this week.</p>
            <p>Thank you for your continued excellent work!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNoTasksEmailText(subcontractorName) {
    return `Weekly Task Summary - ${subcontractorName}\n\nGreat news! You have no open tasks this week.\n\nThank you for your continued excellent work!`;
  }

  getPriorityBadge(priority) {
    const priorityClass = `priority-${priority?.toLowerCase() || 'medium'}`;
    return `<span class="priority-badge ${priorityClass}">${priority || 'Medium'}</span>`;
  }

  async sendEmailToSubcontractor(subcontractorName) {
    try {
      const tasks = await getSubcontractorTasks(subcontractorName);
      const emailAddress = this.subcontractorEmails[subcontractorName];
      if (!emailAddress) {
        console.warn(`No email address found for ${subcontractorName}`);
        return { success: false, error: `No email address configured for ${subcontractorName}` };
      }

      const emailContent = this.generateEmailContent(tasks, subcontractorName);
      const result = await this.sendEmail(emailAddress, emailContent);

      // Check if email was actually sent successfully
      const emailSuccess = result && !result.error && !result.skipped && 
                          result.accepted && result.accepted.length > 0;

      return {
        success: emailSuccess,
        subcontractor: subcontractorName,
        taskCount: tasks.length,
        emailAddress: emailAddress,
        emailSent: result,
        message: emailSuccess 
          ? `Email sent successfully to ${emailAddress}` 
          : `Email may not have been delivered. Check spam folder. Response: ${result.response || result.message || 'Unknown'}`,
      };
    } catch (error) {
      console.error(`Error sending email to ${subcontractorName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendEmail(to, emailContent) {
    if (!this.config.smtpHost || !this.config.smtpUser || !this.config.smtpPassword) {
      console.warn('Email not configured. Skipping email send.');
      return { skipped: true, message: 'Email configuration not set up. Task saved to Google Sheets only.' };
    }

    // Validate FROM_EMAIL is set and not a service account email
    if (!this.config.fromEmail || this.config.fromEmail.includes('.iam.gserviceaccount.com')) {
      console.warn('FROM_EMAIL not set or is a service account email. Using SMTP_USER instead.');
      this.config.fromEmail = this.config.smtpUser;
    }

    if (!this.config.fromEmail) {
      throw new Error('FROM_EMAIL must be set. Please set FROM_EMAIL environment variable or use SMTP_USER email.');
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpPort === 465,
        auth: { user: this.config.smtpUser, pass: this.config.smtpPassword },
      });

      // For Brevo, FROM_EMAIL should match SMTP_USER or be a verified sender
      // If they don't match, Brevo will use a relay address which can cause delivery issues
      const fromEmail = this.config.fromEmail;
      const smtpUser = this.config.smtpUser;
      
      // Warn if FROM_EMAIL doesn't match SMTP_USER (common issue with Brevo)
      if (fromEmail !== smtpUser && this.config.smtpHost?.includes('brevo')) {
        console.warn(`WARNING: FROM_EMAIL (${fromEmail}) doesn't match SMTP_USER (${smtpUser}). For Brevo, these should match or FROM_EMAIL must be verified in Brevo dashboard.`);
      }

      const mailOptions = {
        from: `"${this.config.fromName}" <${fromEmail}>`,
        to,
        replyTo: fromEmail, // Add reply-to header
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        headers: {
          'X-Mailer': 'Legendary Homes Task Management',
        },
      };

      console.log(`Sending email:`);
      console.log(`  From: ${fromEmail} (SMTP User: ${smtpUser})`);
      console.log(`  To: ${to}`);
      console.log(`  Subject: ${emailContent.subject}`);
      
      const result = await transporter.sendMail(mailOptions);
      
      console.log(`Email sent successfully:`);
      console.log(`  Message ID: ${result.messageId}`);
      console.log(`  Accepted: ${result.accepted?.join(', ') || 'none'}`);
      console.log(`  Rejected: ${result.rejected?.join(', ') || 'none'}`);
      console.log(`  Response: ${result.response || 'N/A'}`);
      
      // Check if email was actually accepted
      if (result.rejected && result.rejected.length > 0) {
        console.error(`WARNING: Email was rejected for: ${result.rejected.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      console.error('Email send failed:', error.message);
      console.error('Error details:', error);
      return { error: true, message: error.message };
    }
  }

  async sendWeeklyEmails() {
    // ALWAYS fetch contractor emails from Google Sheets first
    let contractorEmails = {};
    
    try {
      console.log('Fetching contractor emails from Google Sheets...');
      contractorEmails = await getContractorEmails();
      console.log(`Fetched ${Object.keys(contractorEmails).length} contractor(s) from Google Sheets`);
    } catch (error) {
      console.warn(`Failed to fetch contractor emails from Google Sheets: ${error.message}. Falling back to config/env...`);
      
      // Fallback to config/env if sheet fetch fails
      if (this.subcontractorEmails && Object.keys(this.subcontractorEmails).length > 0) {
        contractorEmails = this.subcontractorEmails;
        console.log(`Using ${Object.keys(contractorEmails).length} contractor(s) from config/env as fallback`);
      } else {
        const errorMsg = `Failed to fetch contractor emails from Google Sheets: ${error.message}. Please ensure contractors are added to the Contractors tab with email addresses, or set CONTRACTOR_EMAILS environment variable as fallback.`;
        console.error(errorMsg);
        return [{
          success: false,
          error: errorMsg
        }];
      }
    }
    
    // If sheet returned empty, try fallback
    if (Object.keys(contractorEmails).length === 0 && this.subcontractorEmails && Object.keys(this.subcontractorEmails).length > 0) {
      console.warn('No contractors found in Google Sheets. Using config/env as fallback...');
      contractorEmails = this.subcontractorEmails;
    }

    // Validate we have contractor emails
    if (!contractorEmails || typeof contractorEmails !== 'object') {
      const errorMsg = 'No subcontractor emails configured. Please add contractors to the Contractors tab in Google Sheets with email addresses, or set CONTRACTOR_EMAILS environment variable.';
      console.error(errorMsg);
      return [{
        success: false,
        error: errorMsg
      }];
    }

    const contractorNames = Object.keys(contractorEmails);
    if (contractorNames.length === 0) {
      const errorMsg = 'No contractors with email addresses found. Please add contractors to the Contractors tab in Google Sheets (Column A: Name, Column B: Email).';
      console.error(errorMsg);
      return [{
        success: false,
        error: errorMsg
      }];
    }

    // Update instance variable for use in sendEmailToSubcontractor
    this.subcontractorEmails = contractorEmails;

    // Log contractor details for debugging
    console.log(`Found ${contractorNames.length} contractor(s) with email addresses:`);
    contractorNames.forEach(name => {
      console.log(`  - ${name}: ${contractorEmails[name]}`);
    });

    console.log(`Sending weekly emails to ${contractorNames.length} contractor(s): ${contractorNames.join(', ')}`);
    return Promise.all(
      contractorNames.map(name => this.sendEmailToSubcontractor(name))
    );
  }

  async generateBuildertrendCSV(subcontractorName) {
    const tasks = await getSubcontractorTasks(subcontractorName);
    const headers = ['Project', 'Task Title', 'Description', 'Assigned To', 'Due Date', 'Priority', 'Status'];
    const rows = tasks.map(task => [
      task.project || '',
      task.taskTitle || '',
      task.taskDetails || '',
      task.assignedTo || '',
      task.dueDate || '',
      task.priority || 'Medium',
      task.status || 'Open',
    ]);
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  }
}

module.exports = EmailAutomation;

