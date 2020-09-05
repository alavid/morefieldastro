window.onload = () => {

    document.body.style.overflow = "hidden";

    var zoomed = false;
    var clicking = false;
    var prevX;
    var prevY;

    $(".thumbnail").each(function() {

        var width;
        var height;
        var newWidth;

        var img = new Image();
        img.src = $(this).attr("src");

        img.onload = () => {

            height = img.naturalHeight;
            width = img.naturalWidth;

            if (height > 650) newWidth = 650 * (width / height);
            else newWidth = width;

            $("#modal_thumb").css("max-width", newWidth);
        }
    });

    $("#zoom_button").click((event) => {

        let target = $(event.target).parent().children().first().children().first();

        if (zoomed === false) {

            target.css("transform", "translate(75%, 75%) scale(2.5, 2.5)");
            $(event.target).html("-");
            zoomed = true;
        }
        else {

            target.css("transform", "scale(1, 1)");
            $(event.target).html("+");
            zoomed = false;
        }
    });

    $("#thumb_container").mousedown((event) => { press(event); });
    $("#thumb_container").on({"touchstart": (event) => { press(event); }});

    function press(event) {

        if (zoomed) {
            event.preventDefault();
            if (event.type === "mousedown") {

                prevX = event.clientX;
                prevY = event.clientY;
            }
            else {

                var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];

                prevX = touch.pageX;
                prevY = touch.pageY;
            }
            clicking = true;
        }
    }

    $(document).mouseup(() => { clicking = false; });
    $(document).on({"touchend": () => { clicking = false; }});

    $("#thumb_container").mousemove((event) => { move(event); });
    $("#thumb_container").on({"touchmove": (event) => { move(event); }});

    function move(event) {

        console.log("a");

        if (clicking && zoomed) {

            event.preventDefault();

            if (event.type === "mousemove") {

                $("#thumb_container").scrollLeft($("#thumb_container").scrollLeft() + (prevX - event.clientX));
                $("#thumb_container").scrollTop($("#thumb_container").scrollTop() + (prevY - event.clientY));

                prevX = event.clientX;
                prevY = event.clientY;
            }
            else {

                var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];

                $("#thumb_container").scrollLeft($("#thumb_container").scrollLeft() + (prevX - touch.pageX));
                $("#thumb_container").scrollTop($("#thumb_container").scrollTop() + (prevY - touch.pageY));

                prevX = touch.pageX;
                prevY = touch.pageY;
            }
        }
    }

    $("#thumb_container").mouseleave((event) => { clicking = false; });
}
