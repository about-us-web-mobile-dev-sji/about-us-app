import { Injectable } from '@nestjs/common';
import { EmailGateway, EmailMessage } from '../../application/gateways/EmailGateway.js';

/**
 * Console-based email service for development
 * Replace with NodemailerEmailService in production
 */
@Injectable()
export class ConsoleEmailService implements EmailGateway {
  async send(message: EmailMessage): Promise<void> {
    console.log('====================================');
    console.log('EMAIL SENT (Console Mode)');
    console.log('====================================');
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log('------------------------------------');
    console.log(message.text || 'No plain text version');
    console.log('====================================\n');
    
    // In development, also log the HTML for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('HTML Content:');
      console.log(message.html);
      console.log('====================================\n');
    }
  }
}
