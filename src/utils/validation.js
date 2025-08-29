const { findAdminByFirstName, findAdminByLastName, findAdminByEmail } = require("../admin/data/repositories/adminRepository");
const Admin = require("../admin/data/models/adminModel");


const checkIfAdminExists = async (firstName, lastName, email) => {
    const [existingAdminByEmail] = await Promise.all([
        findAdminByEmail(email)
    ]);

    if (existingAdminByEmail) {
        throw new Error('Email is already in use. Please use a different email address.');
    }


    const existingAdminByName = await Admin.findOne({
        firstName: firstName,
        lastName: lastName
    });

    if (existingAdminByName) {
        throw new Error('An admin with this name combination already exists. Please use a different name.');
    }
};

const checkIfUserExists = async (email) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error('Email is already in use');
    }
};

module.exports = { checkIfAdminExists, checkIfUserExists };