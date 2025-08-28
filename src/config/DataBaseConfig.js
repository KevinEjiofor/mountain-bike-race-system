const {connect} = require("mongoose");
const connectDB = async () => {
    try {
        const databaseUri = process.env.MONGO_URI;

        await connect(databaseUri);
        console.log('MongoDB connected 🚀');
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
        process.exit(1);
    }
};
module.exports =connectDB;