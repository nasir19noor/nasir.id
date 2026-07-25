import nodemailer from 'nodemailer';

function transporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
}

interface ReplyNotificationOptions {
    to: string;
    toName: string;
    replierName: string;
    replyText: string;
    articleTitle: string;
    articleUrl: string;
}

// Notifies the original commenter that someone replied to them. Best-effort:
// a failed/misconfigured mailer should never break comment submission.
export async function sendCommentReplyNotification({
    to,
    toName,
    replierName,
    replyText,
    articleTitle,
    articleUrl,
}: ReplyNotificationOptions): Promise<void> {
    try {
        await transporter().sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: `${replierName} replied to your comment on "${articleTitle}"`,
            html: `
                <p>Hi ${toName},</p>
                <p><strong>${replierName}</strong> replied to your comment on <strong>${articleTitle}</strong>:</p>
                <blockquote style="border-left:3px solid #3b82f6;margin:0;padding-left:12px;color:#334155;">
                    ${replyText.replace(/\n/g, '<br>')}
                </blockquote>
                <p><a href="${articleUrl}">View the conversation</a></p>
            `,
        });
        console.log(`✅ [MAIL] Reply notification sent to ${to}`);
    } catch (error) {
        console.error('💥 [MAIL] Failed to send reply notification:', error);
    }
}
