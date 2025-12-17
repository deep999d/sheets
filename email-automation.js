const { getSubcontractorTasks } = require('./google-sheets-actions');
const nodemailer = require('nodemailer');

class EmailAutomation {
  constructor(config) {
    this.config = {
      smtpHost: config.smtpHost || process.env.SMTP_HOST,
      smtpPort: config.smtpPort || process.env.SMTP_PORT || 587,
      smtpUser: config.smtpUser || process.env.SMTP_USER,
      smtpPassword: config.smtpPassword || process.env.SMTP_PASSWORD,
      fromEmail: config.fromEmail || process.env.FROM_EMAIL || 'tasks@legendaryhomes.com',
      fromName: config.fromName || 'Legendary Homes Task Management',
    };

    this.subcontractorEmails = config.subcontractorEmails || {};
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

      return {
        success: true,
        subcontractor: subcontractorName,
        taskCount: tasks.length,
        emailSent: result,
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

    try {
      const transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpPort === 465,
        auth: { user: this.config.smtpUser, pass: this.config.smtpPassword },
      });

      return await transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (error) {
      console.error('Email send failed:', error.message);
      return { error: true, message: error.message };
    }
  }

  async sendWeeklyEmails() {
    return Promise.all(
      Object.keys(this.subcontractorEmails).map(name => this.sendEmailToSubcontractor(name))
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

