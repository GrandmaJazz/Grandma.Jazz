import { Resend } from 'resend';
import { renderEmailBrickPng, brickFilename } from './brickImage';

// Simple direct approach - use environment variable
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not found in environment');
    throw new Error('Resend not configured: No API key found');
  }

  console.log('[Email] Resend API key found, creating client');

  // Using verified domain for production emails
  const senderEmail = 'Grandma Jazz <family@mail.grandmajazz.com>';

  return {
    client: new Resend(apiKey),
    fromEmail: senderEmail
  };
}

function getPublicBaseUrl(): string {
  return (process.env.PUBLIC_URL || "https://www.grandmajazz.com").replace(/\/+$/, "");
}

function getBrickImageUrl(title: string, name: string): string {
  const params = new URLSearchParams({ title, name, variant: "email" });
  return `${getPublicBaseUrl()}/api/brick.png?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWelcomeEmail(
  toEmail: string,
  title: string,
  name: string,
  brickImageBase64?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Email] Attempting to send welcome email to ${toEmail}`);

  try {
    const { client, fromEmail } = getResendClient();
    console.log(`[Email] Got Resend client, sending from: ${fromEmail}`);

    // Brick image: prefer client-supplied base64 (legacy), else render server-side
    let brickBuffer: Buffer;
    if (brickImageBase64) {
      brickBuffer = Buffer.from(brickImageBase64, 'base64');
    } else {
      console.log('[Email] No client brick image; rendering server-side via node-canvas');
      brickBuffer = renderEmailBrickPng(title, name);
    }
    const attachments = [
      {
        filename: brickFilename(title, name),
        content: brickBuffer,
        contentType: "image/png",
      },
    ];
    const brickImageUrl = getBrickImageUrl(title, name);
    const emailBackgroundUrl = `${getPublicBaseUrl()}/email-assets/email-canvas.png`;
    const emailCanvasStyle = `background-color: #000000; background-image: linear-gradient(#000000,#000000), url('${emailBackgroundUrl}'); background-repeat: repeat;`;
    const brickAlt = escapeHtml(`${title} ${name}`);

    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      cc: 'grandma@grandmajazz.com',
      subject: `Welcome to the Family, ${title} ${name}!`,
      attachments,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="dark">
          <meta name="supported-color-schemes" content="dark">
          <link href="https://fonts.googleapis.com/css2?family=Galvji:wght@100;200;300;400;700&display=swap" rel="stylesheet">
          <style>
            :root { color-scheme: dark; supported-color-schemes: dark; }
            .gj-canvas { ${emailCanvasStyle} }
            u + .body .gmail-blend-screen { background: #000000; mix-blend-mode: screen; }
            u + .body .gmail-blend-difference { background: #000000; mix-blend-mode: difference; }
            @media screen and (max-width: 640px) {
              .gj-shell { width: 100% !important; }
              .gj-pad { padding-left: 28px !important; padding-right: 28px !important; }
              .gj-brick { width: 320px !important; max-width: 92% !important; height: auto !important; }
            }
          </style>
          <!--[if gte mso 9]>
          <xml xmlns:o="urn:schemas-microsoft-com:office:office"><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
          <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
            <v:fill type="tile" src="${emailBackgroundUrl}" color="#000000"/>
          </v:background>
          <![endif]-->
        </head>
        <body class="body gj-canvas" style="margin: 0; padding: 0; ${emailCanvasStyle} font-family: 'Galvji', Georgia, serif;" bgcolor="#000000" background="${emailBackgroundUrl}">
          <div class="gj-canvas" style="${emailCanvasStyle}">
            <table class="gj-canvas" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
              <tr>
                <td class="gj-canvas" align="center" style="padding: 40px 20px; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
                  <!-- Main Container -->
                  <table class="gj-shell gj-canvas" role="presentation" width="600" cellspacing="0" cellpadding="0" style="width: 600px; max-width: 600px; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">

                    <!-- Header - Welcome to the Family -->
                    <tr>
                      <td class="gj-pad gj-canvas" style="padding: 40px 20px 20px 20px; text-align: center; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
                        <div class="gmail-preserve-black" style="background: #000000; background-image: linear-gradient(#000000,#000000);">
                          <div class="gmail-blend-screen"><div class="gmail-blend-difference">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 300; letter-spacing: 0.15em; margin: 0; font-family: 'Galvji', Georgia, serif;">
                              <font color="#ffffff">Welcome to the Family</font>
                            </h1>
                          </div></div>
                        </div>
                      </td>
                    </tr>

                    <!-- User's Brick -->
                    <tr>
                      <td class="gj-canvas" align="center" style="padding: 20px; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
                        <img
                          class="gj-brick"
                          src="${brickImageUrl}"
                          width="320"
                          alt="${brickAlt}"
                          style="display: block; width: 320px; max-width: 92%; height: auto; border: 0; outline: none; text-decoration: none;"
                        />
                      </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                      <td class="gj-pad gj-canvas" style="padding: 30px 40px; text-align: left; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
                        <div class="gmail-preserve-black" style="background: #000000; background-image: linear-gradient(#000000,#000000);">
                          <div class="gmail-blend-screen"><div class="gmail-blend-difference">
                            <p style="color: #ffffff; font-size: 16px; font-weight: 400; line-height: 1.8; margin: 0 0 20px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">Hello there my dearest, ${name}.</font>
                            </p>
                            <p style="color: #ffffff; font-size: 16px; font-weight: 400; line-height: 1.8; margin: 0 0 20px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">I'm so glad you pressed those buttons and joined the Grandma Jazz family.</font>
                            </p>
                            <p style="color: #ffffff; font-size: 16px; font-weight: 400; line-height: 1.8; margin: 0 0 30px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">As we grow together, I'll be sure to keep you updated on a number of things, not too many emails though, promise.</font>
                            </p>
                          </div></div>
                        </div>
                      </td>
                    </tr>

                    <!-- Discount Section Heading -->
                    <tr>
                      <td class="gj-pad gj-canvas" style="padding: 10px 40px 30px 40px; text-align: left; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
                        <div class="gmail-preserve-black" style="background: #000000; background-image: linear-gradient(#000000,#000000);">
                          <div class="gmail-blend-screen"><div class="gmail-blend-difference">
                            <h2 style="color: #ffffff; font-size: 24px; font-weight: 400; letter-spacing: 0.1em; margin: 0 0 25px 0; font-family: 'Galvji', Georgia, serif;">
                              <font color="#ffffff">To claim your 10% discount, follow these steps:</font>
                            </h2>
                            <p style="color: #ffffff; font-size: 18px; font-weight: 400; line-height: 2.2; margin: 0 0 12px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">&#9312; Walk up to the Budtender.</font>
                            </p>
                            <p style="color: #ffffff; font-size: 18px; font-weight: 400; line-height: 2.2; margin: 0 0 12px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">&#9313; Say the phrase - "Thanks Grandma".</font>
                            </p>
                            <p style="color: #ffffff; font-size: 18px; font-weight: 400; line-height: 2.2; margin: 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">&#9314; Wink with one eye.</font>
                            </p>
                          </div></div>
                        </div>
                      </td>
                    </tr>

                    <!-- Closing Body -->
                    <tr>
                      <td class="gj-pad gj-canvas" style="padding: 20px 40px 40px 40px; text-align: left; ${emailCanvasStyle}" bgcolor="#000000" background="${emailBackgroundUrl}">
                        <div class="gmail-preserve-black" style="background: #000000; background-image: linear-gradient(#000000,#000000);">
                          <div class="gmail-blend-screen"><div class="gmail-blend-difference">
                            <p style="color: #ffffff; font-size: 16px; font-weight: 400; line-height: 1.8; margin: 0 0 20px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">You can do it now or a little bit later, up to you, my dear.</font>
                            </p>
                            <p style="color: #ffffff; font-size: 16px; font-weight: 400; line-height: 1.8; margin: 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;">
                              <font color="#ffffff">Easy peasy.</font>
                            </p>
                          </div></div>
                        </div>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Welcome email sent to ${toEmail}, id: ${data?.id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
