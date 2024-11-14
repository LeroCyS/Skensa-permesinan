const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

dotenv.config();

const User = require("./models/User");

mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
  });

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});
app.get("/guru", (req, res) => {
  res.render("dataGuru");
});
app.get("/kelas", (req, res) => {
  res.render("dataKelas");
});

app.get("/login", (req, res) => {
  res.render("login", { message: null, success: null });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.render("login", { message: "Email tidak ditemukan", success: null });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      return res.redirect("/dashboard");
    } else {
      return res.render("login", { message: "Password salah", success: null });
    }
  } catch (err) {
    return res.render("login", { message: "Terjadi kesalahan saat login", success: null });
  }
});

app.get("/register", (req, res) => {
  res.render("register", { message: null, success: null });
});

app.post("/register", async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.render("register", { message: "Password dan konfirmasi password tidak cocok", success: null });
  }

  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.render("register", { message: "Email sudah terdaftar", success: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    return res.render("register", { message: null, success: "Registrasi berhasil! Silakan login." });
  } catch (err) {
    return res.render("register", { message: "Terjadi kesalahan saat registrasi", success: null });
  }
});

app.get("/reset-password", (req, res) => {
  res.render("reset-password", { message: null });
});

app.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.render("reset-password", { message: "Email tidak ditemukan" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetLink = `http://localhost:${port}/reset-password/${resetToken}`;

    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 3600000; // 1 jam
    await user.save();

    await transporter.sendMail({
      to: user.email,
      subject: "Reset Password",
      text: `Halo Teman ! ,
    
    Kami menerima permintaan untuk mereset kata sandi akun Anda. Silakan klik tautan berikut untuk mengatur ulang kata sandi Anda:
    
    ${resetLink}
    
    Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini. Tautan ini hanya berlaku selama 24 jam.
    
    Terima kasih,
    Tim Support`
    });
    

    res.render("reset-password", { message: "Link reset password telah dikirim ke email Anda." });
  } catch (err) {
    res.render("reset-password", { message: "Terjadi kesalahan saat mengirim link reset password." });
  }
});

app.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render("reset-password", { message: "Token reset tidak valid atau telah kedaluwarsa." });
    }

    res.render("reset-password-form", { email: user.email, token, message: null });
  } catch (err) {
    res.render("reset-password", { message: "Terjadi kesalahan saat memvalidasi token." });
  }
});

app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.render("reset-password-form", { message: "Password dan konfirmasi password tidak cocok." });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render("reset-password", { message: "Token reset tidak valid atau telah kedaluwarsa." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.redirect("/login");
  } catch (err) {
    res.render("reset-password", { message: "Terjadi kesalahan saat mengubah password." });
  }
});
