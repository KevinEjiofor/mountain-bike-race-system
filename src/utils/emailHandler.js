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
                subject,
                text,
                ...(html && { html }),
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
    testEmailConnection,
    closeConnection
};
