import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  sendEmail(payload: EmailPayload): Promise<void>;
}

export class NodemailerSender implements EmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly usingMailtrap: boolean;

  constructor() {
    this.usingMailtrap = Boolean(env.mailtrapUser && env.mailtrapPass);
    if (this.usingMailtrap) {
      this.transporter = nodemailer.createTransport({
        host: env.mailtrapHost,
        port: env.mailtrapPort,
        auth: {
          user: env.mailtrapUser,
          pass: env.mailtrapPass,
        },
      });
    } else {
      // Fallback JSON transport so local/Docker runs succeed without Mailtrap credentials
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    const info = await this.transporter.sendMail({
      from: env.emailFrom,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    logger.info(
      {
        to: payload.to,
        subject: payload.subject,
        transport: this.usingMailtrap ? 'mailtrap-smtp' : 'local-json-mock',
        messageId: info.messageId,
      },
      'Dispatched email notification'
    );
  }
}
