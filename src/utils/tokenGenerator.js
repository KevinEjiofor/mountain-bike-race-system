
const generateResetToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


const generateOrderNumber =() => {
    const timestamp = Date.now().toString();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${randomStr}`;
}

module.exports = { generateResetToken,generateOrderNumber };