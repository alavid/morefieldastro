window.onload = () => {

    document.body.style.overflow = "hidden";

    var zoom = 1;
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

            if (height > 600) newWidth = 600 * (width / height);
            else newWidth = width;

            $("#modal_thumb").css("max-width", newWidth);
        }
    });

    $("#open_full_screen").click((event) => {

        $("#full_screen").css("display", "block");
    });

    $("#close_full_screen").click((event) => {

        $("#full_screen").css("display", "none");
    });

    $("#zoom_in").click((event) => {

        if (zoom !== 4) {

            let containerSize = {width: $("#modal_thumb").width(), height: $("#modal_thumb").height()};
            let target = $(".thumbnail");
            let scroll = { left: $("#thumb_container").scrollLeft(), top: $("#thumb_container").scrollTop() }

            if (scroll.left === 0) {

                scroll.left = containerSize.width / 2;
                scroll.top = containerSize.height / 2;
            }
            else {

                scroll.left = scroll.left / ((zoom - 1) / zoom);
                scroll.top = scroll.top / ((zoom - 1) / zoom);
            }

            zoom++;
            var translation = ((zoom - 1) * 100) / 2;
            target.css("transform", `translate(${translation}%, ${translation}%) scale(${zoom}, ${zoom})`);

            if (zoom === 4) $("#zoom_in").css("color", "#cfcfcf");
            $("#zoom_out").css("color", "black");

            $("#thumb_container").scrollLeft(scroll.left);
            $("#thumb_container").scrollTop(scroll.top);
        }
    });

    $("#zoom_out").click((event) => {

        if (zoom !== 1) {

            let containerSize = {width: $("#modal_thumb").width(), height: $("#modal_thumb").height()};
            let target = $(".thumbnail");
            let scroll = { left: $("#thumb_container").scrollLeft(), top: $("#thumb_container").scrollTop() }

            scroll.left = scroll.left * ((zoom - 2) / (zoom - 1));
            scroll.top = scroll.top * ((zoom - 2) / (zoom - 1));

            zoom--;
            var translation = ((zoom - 1) * 100) / 2;
            target.css("transform", `translate(${translation}%, ${translation}%) scale(${zoom}, ${zoom})`);

            if (zoom === 1) $("#zoom_out").css("color", "#cfcfcf");
            $("#zoom_in").css("color", "black");

            $("#thumb_container").scrollLeft(scroll.left);
            $("#thumb_container").scrollTop(scroll.top);
        }
    });

    $("#thumb_container").mousedown((event) => { press(event); });
    $("#thumb_container").on({"touchstart": (event) => { press(event); }});

    function press(event) {

        if (zoom !== 1) {
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

        if (clicking && zoom !== 1) {

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
