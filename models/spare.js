const mongoose = require("mongoose");

const sparePartSchema = new mongoose.Schema({
    partName: { type: String, required: true },
    partNumber: String,
    category: String,
    price: Number,
    stock: Number,
    minStock: Number,
    supplier: String
}, { timestamps: true });

module.exports = mongoose.model("SparePart", sparePartSchema);
