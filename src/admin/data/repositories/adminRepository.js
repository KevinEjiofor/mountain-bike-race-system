const Admin = require('../models/adminModel');

const findAdminByName = async (name) => {
    return Admin.findOne({ name });
};

const findAdminByEmail = async (email) => {
    return Admin.findOne({ email });
};

const createAdmin = async (name, email, password) => {
    const newAdmin = new Admin({ name, email, password });
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
    findAdminByName,
    createAdmin,
    updatePassword
};
