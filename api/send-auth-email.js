// api/send-auth-email.js

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the webhook secret from Supabase
  const supabaseSecret = req.headers['x-supabase-signature'];
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  
  if (!supabaseSecret || supabaseSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { 
      email_type,
      user: { email },
      email_data: { 
        confirmation_url,
        recovery_url,
        magic_link_url,
        email_action_type
      }
    } = req.body;

    let subject, html;

    // Handle different email types
    switch (email_type) {
      case 'confirmation':
        subject = 'Welcome to VolunteerHub - Confirm Your Account';
        html = `
          <h1>Welcome to VolunteerHub!</h1>
          <p>Please click the link below to confirm your account:</p>
          <a href="${confirmation_url}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Confirm Account
          </a>
          <p>If the button doesn't work, copy and paste this link: ${confirmation_url}</p>
        `;
        break;

      case 'recovery':
        subject = 'Reset Your VolunteerHub Password';
        html = `
          <h1>Reset Your Password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${recovery_url}" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
          <p>If the button doesn't work, copy and paste this link: ${recovery_url}</p>
          <p>If you didn't request this, please ignore this email.</p>
        `;
        break;

      case 'magic_link':
        subject = 'Your VolunteerHub Login Link';
        html = `
          <h1>Login to VolunteerHub</h1>
          <p>Click the link below to log in:</p>
          <a href="${magic_link_url}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Log In
          </a>
          <p>If the button doesn't work, copy and paste this link: ${magic_link_url}</p>
        `;
        break;

      case 'invite':
        subject = 'You\'ve been invited to VolunteerHub';
        html = `
          <h1>You're Invited to VolunteerHub!</h1>
          <p>You've been invited to join our volunteer management system. Click the link below to set up your account:</p>
          <a href="${confirmation_url}" style="background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
          <p>If the button doesn't work, copy and paste this link: ${confirmation_url}</p>
        `;
        break;

      default:
        subject = 'VolunteerHub Notification';
        html = `
          <h1>VolunteerHub</h1>
          <p>You have a notification from VolunteerHub.</p>
          ${confirmation_url ? `<a href="${confirmation_url}">Click here to continue</a>` : ''}
        `;
    }

    // Send email via MailChannels
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: email }],
          },
        ],
        from: {
          email: 'noreply@nonprofit-webapp.vercel.app',
          name: 'VolunteerHub',
        },
        subject,
        content: [
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MailChannels API error: ${response.status} ${errorText}`);
    }

    console.log(`Email sent successfully to ${email} for ${email_type}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}