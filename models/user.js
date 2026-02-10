// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//     name: String,
//     email: { type: String, unique: true },
//     phone: { type: String, unique: true },
//     password: String,
//     role: {type: String,enum: ["admin", "staff", "customer"]}
// });

// module.exports = mongoose.model("User", userSchema);


const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    
  name: String,
  email: { type: String, unique: true },
  phone: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "staff", "customer"] }
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);
