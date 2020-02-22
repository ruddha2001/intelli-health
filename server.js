require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const MongoClient = require("mongodb").MongoClient;
const jwt = require("jsonwebtoken");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const app = express();

const apiLimiter = rateLimit({
  windowMs: 1000,
  max: 5
});

app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SECRET,
    cookie: { maxAge: 300000 },
    resave: true,
    saveUninitialized: false
  })
);

const client = new MongoClient(process.env.MONGOURL, {
  useUnifiedTopology: true
});

client.connect(function(err) {
  if (err) return console.log(err);
  console.log("Connected successfully to MongoDB Atlas");
});

let transporter = nodemailer.createTransport({
  host: "smtp.hostinger.in",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTPUSER,
    pass: process.env.SMTPPASSWORD
  }
});

app.use(cors());
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Express serves static content from site
app.use(express.static(__dirname + "/site"));

//Auth Middleware
let auth = async function(req, res, next) {
  try {
    let status = await jwt.verify(req.session.token, process.env.SECRET);
    return next();
  } catch (err) {
    return res.sendFile(path.join(__dirname + "/site/index.html"));
  }
};

//Mailing API
app.post("/mail", async function(req, res) {
  try {
    let info = await transporter.sendMail({
      from: "IntelliHealth <me@aniruddha.net>", // sender address
      to: req.body.to, // list of receivers
      subject: req.body.sub, // Subject line
      text: req.body.text, // plain text body
      html: req.body.html // html body
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

//Incoming API
app.post("/incoming", function(req, res) {
  try {
    let date_ob = new Date();
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    let fullDate = date + "-" + month + "-" + year;
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    let fullTime = hours + ":" + minutes + ":" + seconds;
    let data = req.body;
    let id = data.substring(0, 4);
    let value = data.substring(5);
    let collectinName = "patientData" + id;
    let collection = client.db("intelliHealth").collection(collectinName);
    let response = collection.insertOne({
      date: fullDate,
      time: fullTime,
      pulse: value
    });
    res.sendStatus(200);
  } catch (err) {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    }
  }
});

//Login API
app.post("/login", async function(req, res) {
  let email = req.body.email;
  let password = req.body.password;

  let collection = client.db("intelliHealth").collection("users");

  try {
    let result = await collection.findOne({ email: email });
    let status = await bcrypt.compare(password, result["password"]);
    if (status) {
      let token = jwt.sign(
        {
          email: email,
          name: result["name"]
        },
        process.env.SECRET,
        {
          expiresIn: "1h",
          issuer: "intellihealth"
        }
      );
      req.session.token = token;
      res.redirect("/dashboard");
    } else {
      return res.sendFile(path.join(__dirname + "/site/login.html"));
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

//Register API
app.post("/register", async function(req, res) {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;

  try {
    let hash = await bcrypt.hash(password, 14);
    let collection = client.db("intelliHealth").collection("users");
    try {
      let response = await collection.find({ email: email }).toArray();
      if (response.length != 0) {
        console.log("Existing Email");
        return res.sendFile(path.join(__dirname + "/register.html"));
      } else {
        try {
          let result = await collection.insertOne({
            name: name,
            email: email,
            password: hash
          });
          return res.sendStatus(200);
        } catch (err) {
          console.log(err);
          return res.sendStatus(500);
        }
      }
    } catch (err) {
      console.log(err);
      return res.sendStatus(401);
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

//Homepage
app.get("/", function(req, res) {
  res.sendFile("index.html");
});

//Dashboard
app.get("/dashboard", auth, function(req, res) {
  res.sendFile(path.join(__dirname + "/site/dashboard.html"));
});

app.listen(6600, function(err) {
  if (err) return console.log(err);
  console.log("Server running on Port 6600");
});
