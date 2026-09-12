export interface SchoolInvitationEmailData {
  schoolName: string;
  invitationLink: string;
  expiresAt: Date;
  inviterName: string;
}

export function generateSchoolInvitationEmail(data: SchoolInvitationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const expirationDate = data.expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Invitation to Administrate ${data.schoolName}`;

  const text = `
You have been invited to become the main administrator of ${data.schoolName}

${data.inviterName} has invited you to join the platform as the main administrator for ${data.schoolName}.

To accept this invitation, please click the following link:
${data.invitationLink}

This invitation will expire on ${expirationDate}.

If you did not expect this invitation, you can safely ignore this email.
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>School Administrator Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">Administrator Invitation</h1>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      You have been invited to become the main administrator of <strong>${data.schoolName}</strong>.
    </p>
    
    <p style="margin-bottom: 20px;">
      ${data.inviterName} has invited you to join the platform as the main administrator for this school.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.invitationLink}" 
         style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      <strong>Important:</strong> This invitation will expire on ${expirationDate}.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    
    <p style="font-size: 12px; color: #999;">
      If you did not expect this invitation, you can safely ignore this email.
      The link will expire automatically.
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}
