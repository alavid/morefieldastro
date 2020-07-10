window.onload = () => {

    document.body.style.overflow = "hidden";

    $(".thumbnail").each(function() {

        var width;
        var height;
        var newWidth;

        var img = new Image();
        img.src = $(this).attr("src");

        img.onload = () => {

            height = img.naturalHeight;
            width = img.naturalWidth;

            if (height > 700) newWidth = 700 * (width / height);
            else newWidth = width;

            $("#modal_thumb").css("max-width", newWidth);
        }
    })
}
