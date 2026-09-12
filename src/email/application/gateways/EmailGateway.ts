export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailGateway {
  send(message: EmailMessage): Promise<void>;
}
