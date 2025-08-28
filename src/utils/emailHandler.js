const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = process.env;

const createTransporter = () => {
    try {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
            pool: true,
            maxConnections: 3,
            maxMessages: 50,
            rateDelta: 1000,
            rateLimit: 3,
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            socketTimeout: 10000,
            greetingTimeout: 10000
        });
    } catch (error) {
        console.error('Email transporter creation failed:', error);
        throw new Error('Email service configuration error');
    }
};

const transporter = createTransporter();

const sendEmail = async (to, subject, text, html = null, retries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (!to || !subject || !text) {
                throw new Error('Missing required email parameters');
            }

            if (!EMAIL_USER) {
                throw new Error('EMAIL_USER not configured');
            }

            const mailOptions = {
                from: `"Admin Notifications" <${EMAIL_USER}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                text: text,
                ...(html && { html: html }),
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'X-Mailer': 'Admin System v1.0'
                }
            };

            const info = await transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };

        } catch (error) {
            lastError = error;
            console.error(`Email attempt ${attempt} failed:`, error.message);

            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                continue;
            }
        }
    }

    throw new Error(`Email delivery failed after ${retries} attempts: ${lastError.message}`);
};

const userNotifications = async (to, subject, text, options = {}) => {
    try {
        if (!to || !subject || !text) {
            throw new Error('Missing required notification parameters');
        }

        const defaultOptions = {
            priority: 'normal',
            category: 'general',
            includeUnsubscribe: true
        };

        const config = { ...defaultOptions, ...options };
        let enhancedText = text;

        if (config.includeUnsubscribe) {
            enhancedText += `\n\n═══════════════════════════════════════════════════════\n\n`;
            enhancedText += `Company Information:\nEverything Mandalazz\n`;
            enhancedText += `This email was sent to: ${to}\n© ${new Date().getFullYear()} Everything Mandalazz`;
        }

        const mailOptions = {
            from: `"User Notifications" <${EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: enhancedText,
            headers: {
                'X-Category': config.category,
                'X-Mailer': 'User Notification System v1.0',
                'List-Unsubscribe': `<https://yourcompany.com/unsubscribe?email=${encodeURIComponent(to)}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        throw new Error('Unable to send notification');
    }
};

const sendBulkEmails = async (recipients, subject, text, options = {}) => {
    const results = { successful: [], failed: [] };
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 1000;

    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        await Promise.all(batch.map(async (recipient) => {
            try {
                await userNotifications(recipient, subject, text, options);
                results.successful.push(recipient);
            } catch (error) {
                results.failed.push({ recipient, error: error.message });
            }
        }));

        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return results;
};

const testEmailConnection = async () => {
    try {
        await transporter.verify();
        return { success: true, message: 'Email server is ready' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const closeConnection = () => {
    if (transporter && transporter.close) {
        transporter.close();
    }
};

module.exports = {
    sendEmail,
    userNotifications,
    sendBulkEmails,
    testEmailConnection,
    closeConnection
};