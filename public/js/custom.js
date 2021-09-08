//jshint esversion:6

$(document).ready(function () {
  $("body").materialScrollTop();
});

let _URL = window.URL;
$("#photoInput").change(function (e) {
  let file, img;
  if ((file = this.files[0])) {
    img = new Image();
    img.onload = function () {
      if (this.width < 319 && this.height < 241) {
        alert("File is too small.");
        location.reload();
      } else if (this.width > 1024 && this.height > 768) {
        alert("File is too big.");
        location.reload();
      }
    };

    img.src = _URL.createObjectURL(file);
  }
});
// init rich text-editor
tinymce.init({
  selector: "#mytextarea",
  height: 300,
  menubar: "file edit format help",
  plugins:
    "advlist lists link autolink autosave code preview searchreplace wordcount media table emoticons image image tools help fullscreen",
  toolbar:
    "bold italic underline | alignleft aligncenter alignright align justify | bullist numlist outdent indent | link image media | forecolor backcolor emoticons fullscreen code preview searchreplace",
  relative_urls: false,
  automatic_uploads: true,
  images_upload_url: "/image",
  images_upload_handler: function (blobinfo, success, failure) {
    let headers = new Headers();
    headers.append("Accept", "Application/JSON");
    let formData = new FormData();
    formData.append("inside-post-image", blobinfo.blob(), blobinfo.filename());

    let req = new Request("/image", {
      method: "POST",
      headers,
      mode: "cors",
      body: formData,
    });

    fetch(req)
      .then((res) => res.json())
      .then((data) => success(data.imageUrl))
      .catch(() => failure("HTTP Error"));
  },
});

function getImgSrc() {
  var x = document.getElementsById().getElementsByTagName("*");
}
