require('dotenv').config();

module.exports = {
    MONGO_URI: process.env.MONGO_URI ,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ,
    NODE_ENV: process.env.NODE_ENV ,
    PORT: process.env.PORT ,
    SMTP_CONFIG: {
        host: process.env.SMTP_HOST ,
        port: process.env.SMTP_PORT ,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ,
        },
    },
};
