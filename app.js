//jshint esversion:6
//jshint esversion:8
require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const ejs = require("ejs");
const _ = require("lodash");
const moment = require("moment");
const multer = require("multer");
const https = require("https");

//initial express
const app = express();

//initial ejs
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));
app.use(methodOverride("_method"));

//initialize session and passport
app.use(
  session({
    secret: `${process.env.SECRET}`,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//mongoose connection
mongoose.connect("mongodb://localhost:27017/EmonDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});
mongoose.set("useCreateIndex", true);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("we're connected!");
});

//mongoose post schema
const postSchema = new mongoose.Schema({
  category: String,
  title: String,
  content: String,
  image: String,
  postTime: String,
  readTime: String,
});

//admin-login postSchema
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

//passportLocalMongoose plugin
adminSchema.plugin(passportLocalMongoose);

//mongoose model
const Post = mongoose.model("Post", postSchema);
const Admin = mongoose.model("Admin", adminSchema);

//passport createStrategy . and making session
passport.use(Admin.createStrategy());

passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

//image upload via multer
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().getTime() + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("file should be jpeg or png.!"), false);
  }
};

let upload = multer({
  storage: storage,
  limits: {
    filesize: 1024 * 1024 * 5,
  },
  fileFilter: fileFilter,
});
//initial momnet for getTime
moment.locale();

//post array
app.get("/", function (req, res) {
  Post.find({}, function (err, posts) {
    res.render("index", {
      posts: posts,
    });
  });
});

//about route
app.get("/about", function (req, res) {
  res.render("about");
});
//find post and render
app.get("/posts", function (req, res) {
  Post.find({}, function (err, posts) {
    res.render("postBox", {
      posts: posts,
    });
  }).sort({ date: -1 });
});
//single post
app.get("/posts/:postId", async function (req, res) {
  try {
    const requestedPostId = req.params.postId;
    const post = await Post.findOne({ _id: requestedPostId });
    const posts = await Post.aggregate([
      { $match: { _id: { $ne: post._id } } },
      { $sample: { size: 3 } },
    ]);

    res.render("post", {
      category: post.category,
      title: post.title,
      image: post.image,
      content: post.content,
      morePost: posts,
    });
  } catch (err) {
    res.send(err);
  }
});
//compose route
app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    Post.find({}, function (err, posts) {
      res.render("compose", {
        posts: posts,
      });
    }).sort({ date: -1 });
  } else {
    res.redirect("/login");
  }
});
app.post("/compose", upload.single("postImage"), function (req, res) {
  const post = new Post({
    category: _.upperCase(req.body.postCategory),
    title: req.body.postTitle,
    content: req.body.postBody,
    image: req.file.filename,
    postTime: _.upperCase(moment().format("LL")),
    readTime: _.upperCase(req.body.readTime),
  });
  post.save(function (err) {
    if (!err) {
      res.redirect("/compose");
    }
  });
});
// image upload route for text editor
app.post("/image", upload.single("inside-post-image"), function (
  req,
  res,
  next
) {
  if (req.file) {
    return res.status(200).json({
      imageUrl: `/image/${req.file.filename}`,
    });
  }

  return res.status(500).json({
    message: "Server Error",
  });
});

//delete route
app.delete("/posts/:postId/:imagefilename", async function (req, res) {
  try {
    const requestedPostId = req.params.postId;
    const imgfileName = req.params.imagefilename;
    const path = `./public/image/${imgfileName}`;
    await Post.findOneAndRemove({ _id: requestedPostId });

    await fs.unlinkSync(path);

    res.redirect("/compose");
  } catch (err) {
    res.send(err);
  }
});

//user-subscription mailchimp
app.post("/user-subscription", function (req, res) {
  const userEmail = req.body.userEmail;

  const data = {
    members: [
      {
        email_address: userEmail,
        status: "subscribed",
      },
    ],
  };

  const jsonData = JSON.stringify(data);
  const url = `https://us2.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}`;
  const options = {
    method: "POST",
    auth: `Shakib:${process.env.MAILCHIMP_API_KEY}`,
  };
  const request = https.request(url, options, function (response) {
    response.on("data", function (data) {
      let responseData = JSON.parse(data);
      if (responseData.new_members.length === 0) {
        res.render("failure");
      } else {
        res.render("success");
      }
    });
  });

  request.write(jsonData);
  request.end();
});
// success failure route
app.post("/success", function (req, res) {
  res.redirect("/");
});
app.post("/failure", function (req, res) {
  res.redirect("/");
});

//admin auth
app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  Admin.find({}, function (err, adminData) {
    if (adminData.length === 0) {
      Admin.register(
        { username: req.body.username },
        req.body.password,
        function (err, admin) {
          if (err) {
            console.log(err);
            res.redirect("/register");
          } else {
            passport.authenticate("local")(req, res, function () {
              res.redirect("/login");
            });
          }
        }
      );
    } else {
      res.send("There is already an admin!");
    }
  });
});

app.post("/login", function (req, res) {
  const admin = new Admin({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(admin, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/compose");
      });
    }
  });
});

//logout from compose
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/login");
});
// update post route
app.get("/update/:postId", async function (req, res) {
  try {
    const requestedPostId = req.params.postId;
    const post = await Post.findOne({ _id: requestedPostId });
    if (!post) {
      res.send("404 Page not found");
    } else {
      res.render("update", {
        post: post,
      });
    }
  } catch (err) {
    res.send(err);
  }
});
app.post("/update/:postId", upload.single("postImage"), async function (
  req,
  res
) {
  try {
    const post = await Post.findOne({ _id: req.params.postId });
    let image = post.image;
    if (req.file) {
      image = req.file.filename;
    }
    await Post.findOneAndUpdate(
      { _id: req.params.postId },
      {
        category: _.upperCase(req.body.postCategory),
        title: req.body.postTitle,
        content: req.body.postBody,
        image: image,
        postTime: _.upperCase(moment().format("LL")),
        readTime: _.upperCase(req.body.readTime),
      },
      { new: false, overwrite: true, runValidators: true }
    );
    res.redirect("/compose");
  } catch (err) {
    if (!err) {
      res.send("Succesfully Updated the article!");
    } else {
      res.send(err);
    }
  }
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
