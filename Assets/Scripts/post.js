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

            if (height > 625) newWidth = 625 * (width / height);
            else newWidth = width;

            $("#modal_thumb").css("max-width", newWidth);
        }
    });

    $("#zoom_in").click((event) => {

        let container = $(event.target).parent();
        let containerSize = {width: $(container).width(), height: $(container).height()};
        let target = $(container).children().first().children().first();
        let scroll = {left: $(target).parent().scrollLeft(), top: $(target).parent().scrollTop()}

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
        
        if (zoom === 4) $("#zoom_in").css("display", "none");
        $("#zoom_out").css("display", "block");

        $(target).parent().scrollLeft(scroll.left);
        $(target).parent().scrollTop(scroll.top);
    });

    $("#zoom_out").click((event) => {

        let container = $(event.target).parent();
        let containerSize = {width: $(container).width(), height: $(container).height()};
        let target = $(container).children().first().children().first();
        let scroll = { left: $(target).parent().scrollLeft(), top: $(target).parent().scrollTop() }

        scroll.left = scroll.left * ((zoom - 2) / (zoom - 1));
        scroll.top = scroll.top * ((zoom - 2) / (zoom - 1));

        zoom--;
        var translation = ((zoom - 1) * 100) / 2;
        target.css("transform", `translate(${translation}%, ${translation}%) scale(${zoom}, ${zoom})`);

        if (zoom === 1) $("#zoom_out").css("display", "none");
        $("#zoom_in").css("display", "block");

        $(target).parent().scrollLeft(scroll.left);
        $(target).parent().scrollTop(scroll.top);
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
