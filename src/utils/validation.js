const { findAdminByName, findAdminByEmail } = require("../admin/data/repositories/adminRepository");


const checkIfAdminExists = async (name, email) => {
    const [existingAdminByName, existingAdminByEmail] = await Promise.all([
        findAdminByName(name),
        findAdminByEmail(email)
    ]);

    if (existingAdminByName) {
        throw new Error('Admin name is already taken. Please choose another name.');
    }

    if (existingAdminByEmail) {
        throw new Error('Email is already in use. Please use a different email address.');
    }
};


const checkIfUserExists = async (email) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error('Email is already in use');
    }
};

module.exports = { checkIfAdminExists, checkIfUserExists };
