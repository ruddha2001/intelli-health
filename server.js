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
const axios = require("axios").default;

let counter = 0;

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
    if (status) {
      let decoded = jwt.decode(req.session.token);
      res.locals.nodeid = decoded.nodeid;
      res.locals.username = decoded.name;
    }
    return next();
  } catch (err) {
    return res.sendFile(path.join(__dirname + "/site/index.html"));
  }
};

//Mailing API
app.get("/mail", async function(req, res) {
  try {
    let info = await transporter.sendMail({
      from: "IntelliHealth <me@aniruddha.net>", // sender address
      to: req.query.to, // list of receivers
      subject: "IntelliHealth", // Subject line
      text:
        "There is some complications with the vitals of your family member. Please log into https://ih.ruddha.xyz to check on the reports. If in any grave danger, call 108 immediately for an ambulance.", // plain text body
      html:
        "There is some complications with the vitals of your family member. Please log into <a href='https://ih.ruddha.xyz'>https://ih.ruddha.xyz</a> to check on the reports. If in any grave danger, call <b>108</b> immediately for an ambulance." // html body
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

//Doctor Control API
app.post("/doctorcontrol", async function(req, res) {
  let docid = req.body.docid;
  let password = req.body.password;

  let collection = client.db("intelliHealth").collection("doctors");
  try {
    let result = await collection.findOne({ docid: docid });
    let status = await bcrypt.compare(password, result["password"]);
    if (status) {
      let response = await collection.updateOne(
        { nodeid: req.body.nodeid },
        { $set: { notif: req.body.notif } }
      );
      res.sendFile(path.join(__dirname + "/site/success.html"));
    } else {
      return res.sendFile(path.join(__dirname + "/site/fail.html"));
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
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

//Notification Function
let notificationFunc = function(mobile, email) {
  let url = "https://www.aniruddha.net/parallax/sms.php?mobile=91" + mobile;
  axios.get(url).then(function(ans) {
    if (ans.status == 200) {
      console.log("Message sent successfully");
    }
  });
  url = "https://ih.ruddha.xyz/mail?to=" + email;
  axios.get(url).then(function(ans) {
    if (ans == 200) {
      console.log("Email sent successfully");
    }
  });
};

//Problem Logging Function
let problemLog = function() {
  let date_ob = new Date();
  let date = date_ob.getDate();
  let month = date_ob.getMonth() + 1;
  let year = date_ob.getFullYear();
  let fullDate = date + "-" + month + "-" + year;
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  let fullTime = hours + ":" + minutes + ":" + seconds;
  let collection = client.db("intelliHealth").collection("problem");
  collection.insertOne({ date: fullDate, time: fullTime }, function(err, res) {
    if (err) console.log(err);
  });
};

//Dashboard Data API
app.get("/datapoint", auth, async function(req, res) {
  let nodeid = req.query.nodeid.substring(0, 4);
  let collect = "patientData" + nodeid;
  let collection = client.db("intelliHealth").collection(collect);
  let result = await collection
    .find({})
    .sort({ _id: -1 })
    .limit(2)
    .toArray();
  let data = {
    value: result[0].pulse
  };
  collection = client.db("intelliHealth").collection("doctors");
  let resp = await collection.find({ nodeid: nodeid }).toArray();
  if (
    (Math.abs(result[0].pulse - result[1].pulse) / result[1].pulse) * 100 >=
    resp[0].notif
  ) {
    if (counter == 10) {
      notificationFunc(resp[0].mobilefam, resp[0].emailfam);
      problemLog();
      counter = 0;
    } else {
      counter++;
    }
  }
  res.send(data);
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
          name: result["name"],
          nodeid: result["nodeid"]
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
  let nodeid = req.body.nodeid;

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
            password: hash,
            nodeid: nodeid
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
app.get("/dashboard", auth, async function(req, res) {
  let collection = client.db("intelliHealth").collection("problem");
  let result = await collection
    .find({})
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  let str = result[0].date + " " + result[0].time;
  res.render("dashboard.ejs", {
    nodeid: res.locals.nodeid,
    user: res.locals.username,
    pulseprob: str
  });
});

//Records
app.get("/records", auth, function(req, res) {
  res.sendFile("records.html");
});

app.listen(6600, function(err) {
  if (err) return console.log(err);
  console.log("Server running on Port 6600");
});
