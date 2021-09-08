//jshint esversion:6
//jshint esversion:8
require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const ejs = require("ejs");
const _ = require("lodash");
const moment = require("moment");
const multer = require("multer");
const https = require("https");

//mongoose connection
mongoose.connect("mongodb://localhost:27017/EmonDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
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
  readTime: String,
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
app.use(methodOverride("_method"));

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

app.get("/posts", function (req, res) {
  Post.find({}, function (err, posts) {
    res.render("postBox", {
      posts: posts,
    });
  }).sort({ date: -1 });
});

app.get("/compose", function (req, res) {
  Post.find({}, function (err, posts) {
    res.render("compose", {
      posts: posts,
    });
  }).sort({ date: -1 });
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
      res.redirect("/");
    }
  });
});

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
app.post("/success", function (req, res) {
  res.redirect("/");
});
app.post("/failure", function (req, res) {
  res.redirect("/");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
