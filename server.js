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

const app = express();

const apiLimiter = rateLimit({
  windowMs: 1000,
  max: 1
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
    return res.sendFile(path.join(__dirname + "/site/login.html"));
  }
};

app.post("/incoming", function(req, res) {
  console.log(req.body);
  res.sendStatus(200);
});

//Login API
app.post("/login", async function(req, res) {
  let email = req.body.email;
  let password = req.body.password;

  let collection = client.db("patientPlus").collection("users");

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
          issuer: "patientcare"
        }
      );
      req.session.token = token;
      res.redirect("/");
    } else {
      return res.sendFile(path.join(__dirname + "/site/login.html"));
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

app.listen(6600, function(err) {
  if (err) return console.log(err);
  console.log("Server running on Port 6600");
});
