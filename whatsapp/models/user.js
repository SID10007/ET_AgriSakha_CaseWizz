const { Stroller } = require("@mui/icons-material");
const { default: mongoose } = require("mongoose");

// var db = mongoose.createConnection('localhost', 'whatsapp');

const userSchema = new mongoose.Schema({
    user: String,
    number : Number,
    active : Boolean
})

module.exports = mongoose.model('userSchema', userSchema)