//jshint esversion:6
const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const moment = require("moment");
const multer = require("multer");

//mongoose connection
mongoose.connect("mongodb://localhost:27017/EmonDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("we're connected!");
});
//mongoose post schema
const postSchema = {
  category: String,
  title: String,
  content: String,
  image: String,
  postTime: String,
};
//mongoose model
const Post = mongoose.model("Post", postSchema);

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
moment.locale();

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

//post array
app.get("/", function (req, res) {
  Post.find({}, function (err, posts) {
    res.render("index", {
      posts: posts,
    });
  });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.get("/compose", function (req, res) {
  res.render("compose");
});

app.post("/compose", upload.single("postImage"), function (req, res) {
  const post = new Post({
    category: req.body.postCategory,
    title: req.body.postTitle,
    content: req.body.postBody,
    image: req.file.filename,
    postTime: moment().format("LL"),
  });
  post.save(function (err) {
    if (!err) {
      res.redirect("/");
    }
  });
});
app.get("/posts/:postName", function (req, res) {
  const requestedTitle = _.lowerCase(req.params.postName);

  posts.forEach(function (post) {
    const storedTitle = _.lowerCase(post.title);

    if (storedTitle === requestedTitle) {
      res.render("post", {
        category: post.category,
        title: post.title,
        image: post.imageName,
        content: post.content,
      });
    }
  });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
