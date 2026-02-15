/**
 * Email Service
 * Handles all email sending operations with multiple provider support
 */

import nodemailer from 'nodemailer';
import { logger } from '../logger/logger';
import { env } from '@/config/env';

/**
 * Email Send Options
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email Service Class
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment configuration
   */
  private initializeTransporter(): void {
    try {
      const emailProvider = env.EMAIL_PROVIDER || 'smtp';

      if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
        logger.warn('Email service not configured. SMTP_USER or SMTP_PASSWORD missing.');
        this.isConfigured = false;
        return;
      }

      switch (emailProvider.toLowerCase()) {
        case 'smtp':
          this.transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD,
            },
          });
          break;

        case 'sendgrid':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: env.SENDGRID_API_KEY,
            },
          });
          break;

        case 'ses':
          this.transporter = nodemailer.createTransport({
            host: `email-smtp.${env.AWS_REGION}.amazonaws.com`,
            port: 587,
            secure: false,
            auth: {
              user: env.AWS_SES_ACCESS_KEY,
              pass: env.AWS_SES_SECRET_KEY,
            },
          });
          break;

        default:
          logger.warn(`Unknown email provider: ${emailProvider}. Email service disabled.`);
          return;
      }

      this.isConfigured = true;
      logger.info(`✅ Email service initialized with provider: ${emailProvider}`);
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Verify email transporter connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email service not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('✅ Email service connection verified');
      return true;
    } catch (error) {
      logger.error('❌ Email service verification failed:', error);
      return false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('⚠️ Email service not configured. Email NOT sent:', {
        to: options.to,
        subject: options.subject,
      });
      logger.info('📧 EMAIL CONTENT (would be sent):');
      logger.info(`   To: ${options.to}`);
      logger.info(`   Subject: ${options.subject}`);
      logger.info(`   HTML: ${options.html.substring(0, 200)}...`);
      return false;
    }

    try {
      const mailOptions = {
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to send email:', {
        error,
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const subject = 'Welcome to Shielder Digital Platform!';
    const html = this.getWelcomeEmailTemplate(name);

    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string
  ): Promise<boolean> {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = this.getVerificationEmailTemplate(name, verificationUrl);

    logger.info('📧 Email verification link:', { email, verificationUrl });

    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = 'Reset Your Password';
    const html = this.getPasswordResetEmailTemplate(name, resetUrl);

    logger.info('🔐 Password reset details:', {
      email,
      resetToken,
      resetUrl,
    });

    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send password changed notification email
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<boolean> {
    const subject = 'Your Password Has Been Changed';
    const html = this.getPasswordChangedEmailTemplate(name);

    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send account locked notification email
   */
  async sendAccountLockedEmail(
    email: string,
    name: string,
    lockedUntil: Date
  ): Promise<boolean> {
    const subject = 'Your Account Has Been Temporarily Locked';
    const html = this.getAccountLockedEmailTemplate(name, lockedUntil);

    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Convert HTML to plain text (simple implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Email Templates
   */

  private getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Shielder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Shielder!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea; margin-top: 0;">Hello ${name}!</h2>
            
            <p style="font-size: 16px;">Thank you for joining <strong>Shielder Digital Platform</strong>. We're excited to have you on board!</p>
            
            <p style="font-size: 16px;">Your account has been successfully created. You can now:</p>
            <ul style="font-size: 16px; line-height: 1.8;">
              <li>✓ Browse our products</li>
              <li>✓ Place orders</li>
              <li>✓ Track your shipments</li>
              <li>✓ Manage your profile</li>
            </ul>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${env.FRONTEND_URL}/login" style="background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Get Started</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              If you have any questions, feel free to contact our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Shielder Digital Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationEmailTemplate(name: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✉️ Verify Your Email</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea; margin-top: 0;">Hello ${name}!</h2>
            
            <p style="font-size: 16px;">Thank you for registering with <strong>Shielder Digital Platform</strong>.</p>
            
            <p style="font-size: 16px;">Please verify your email address by clicking the button below:</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Verify Email Address</a>
            </div>
            
            <p style="color: #666; font-size: 14px; background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea;">
              <strong>If the button doesn't work</strong>, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              ⏱️ This link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Shielder Digital Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(name: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Reset Your Password</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea; margin-top: 0;">Hello ${name}!</h2>
            
            <p style="font-size: 16px;">We received a request to reset your password for your <strong>Shielder</strong> account.</p>
            
            <p style="font-size: 16px;">Click the button below to reset your password:</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px; background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea;">
              <strong>If the button doesn't work</strong>, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> This password reset link will expire in <strong>15 minutes</strong>.
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Shielder Digital Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordChangedEmailTemplate(name: string): string {
    const changeTime = new Date().toLocaleString();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed Successfully</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Password Changed Successfully</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #28a745; margin-top: 0;">Hello ${name}!</h2>
            
            <p style="font-size: 16px;">This is to confirm that your password has been successfully changed.</p>
            
            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #155724; font-size: 14px;">
                <strong>✓ Password Changed:</strong> ${changeTime}
              </p>
            </div>
            
            <p style="font-size: 16px;">If you made this change, you can safely ignore this email.</p>
            
            <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;">
                <strong>⚠️ Didn't change your password?</strong><br>
                Please contact our support team immediately to secure your account.
              </p>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${env.FRONTEND_URL}/login" style="background: #28a745; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Login to Your Account</a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Shielder Digital Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getAccountLockedEmailTemplate(name: string, lockedUntil: Date): string {
    const unlockTime = lockedUntil.toLocaleString();
    const minutesLeft = Math.round((lockedUntil.getTime() - Date.now()) / 60000);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Temporarily Locked</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Account Temporarily Locked</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #dc3545; margin-top: 0;">Hello ${name}!</h2>
            
            <p style="font-size: 16px;">Your account has been temporarily locked due to multiple failed login attempts.</p>
            
            <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;">
                <strong>🕐 Account will unlock at:</strong> ${unlockTime}<br>
                <strong>⏱️ Time remaining:</strong> ~${minutesLeft} minutes
              </p>
            </div>
            
            <p style="font-size: 16px;"><strong>Security measures:</strong></p>
            <ul style="font-size: 16px; line-height: 1.8;">
              <li>Your account is locked for 30 minutes</li>
              <li>This protects your account from unauthorized access</li>
              <li>The lock will be removed automatically</li>
            </ul>
            
            <p style="font-size: 16px;"><strong>If this wasn't you:</strong></p>
            <ol style="font-size: 16px; line-height: 1.8;">
              <li>Wait for the automatic unlock</li>
              <li>Reset your password immediately</li>
              <li>Contact our support team</li>
            </ol>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${env.FRONTEND_URL}/forgot-password" style="background: #dc3545; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Shielder Digital Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
