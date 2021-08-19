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

tinymce.init({
  selector: "textarea",
  plugins:
    "a11ychecker advcode casechange export formatpainter linkchecker autolink lists checklist media mediaembed pageembed permanentpen powerpaste table advtable tinycomments tinymcespellchecker",
  toolbar:
    "a11ycheck addcomment showcomments casechange checklist code export formatpainter pageembed permanentpen table",
  toolbar_mode: "floating",
  tinycomments_mode: "embedded",
  tinycomments_author: "Author name",
});
