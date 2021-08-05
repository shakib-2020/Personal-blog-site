//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const moment = require("moment");
const multer = require("multer");
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
const app = express();

app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static("public"));

let posts = [];

app.get("/", function (req, res) {
  res.render("index", {
    posts: posts,
  });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.get("/compose", function (req, res) {
  res.render("compose");
});

app.post("/compose", upload.single("postImage"), function (req, res) {
  // console.log(req.file);
  const post = {
    category: req.body.postCategory,
    title: req.body.postTitle,
    content: req.body.postBody,
    imageName: req.file.filename,
    postTime: moment().format("LL"),
  };
  posts.push(post);
  res.redirect("/");
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
