const Admin = require('../models/adminModel');

const findAdminByFirstName = async (firstName) => {
    return Admin.findOne({ firstName });
};

const findAdminByLastName = async (lastName) => {
    return Admin.findOne({ lastName });
};

const findAdminByEmail = async (email) => {
    return Admin.findOne({ email });
};

const createAdmin = async (firstName, lastName, email, password) => {
    const newAdmin = new Admin({ firstName, lastName, email, password });
    await newAdmin.save();
    return newAdmin;
};

const updatePassword = async (adminId, hashedPassword) => {
    const admin = await Admin.findByIdAndUpdate(
        adminId,
        { $set: { password: hashedPassword } },
        { new: true }
    );
    if (!admin) throw new Error('Admin not found');
    return admin;
};

module.exports = {
    findAdminByEmail,
    findAdminByFirstName,
    findAdminByLastName,
    createAdmin,
    updatePassword
};