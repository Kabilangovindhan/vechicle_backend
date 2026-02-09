const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const UserModel = require("./models/user");


dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ GET ALL USERS (VEHICLES DATA) */
app.get("/api/users", async (req, res) => {
	try {
		const users = await UserModel.find();
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

app.delete("/api/users/:id", async (req, res) => {
	try {
		await UserModel.findByIdAndDelete(req.params.id);
		res.json({ message: "Deleted" });

	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });

	}
});


app.post("/api/users", async (req, res) => {

	try {
		const newUser = await UserModel.create(req.body);
		res.json(newUser);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});


app.put("/api/users/:id", async (req, res) => {

	try {
		const updated = await UserModel.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true }
		);

		res.json(updated);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
