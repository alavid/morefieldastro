$(document).ready(() => {

    $("#submit_post_edit").click(() => {

        if ($("#file").prop("files").length > 0) {

            //First, resize the main image.
            let fileData = $("#file").prop("files")[0];
            let imageData = resize(fileData, 2000);

            imageData.then((data) => {

                let originalSize = `${data.originalSize.width}x${data.originalSize.height}`;

                let formData = new FormData;
                formData.append("file", data.image);

                //Then, upload the main image.
                $.ajax({url: "upload", dataType: "text", cache: false, contentType: false,
                        processData: false, data: formData, type: "POST"})
                .done((res) => {

                    //Then, resize thumbnail
                    let thumbData = resize(fileData, 320, `${fileData.name.split(".")[0]}_thumb.${fileData.name.split(".")[1]}`);

                    thumbData.then((data) => {

                        let thumbData = new FormData;
                        thumbData.append("file", data.image);

                        //Then, upload thumbnail
                        $.ajax({url: "upload", dataType: "text", cache: false, contentType: false,
                                processData: false, data: thumbData, type: "POST"})

                        .done((res) => {

                            //Then, upload the text fields
                            submitText(JSON.parse(res).cube, originalSize);

                        }).catch((err) => {
                            console.log("B");
                            if (err.status === 400) $("#error").html("Internal server error, please try again.");
                            else if (err.status === 403) $("#error").html("Only png and jpeg files are accepted");
                        });

                    }).catch((err) => { $("#error").html("Internal server error, please try again."); })

                }).catch((err) => {
                    console.log("A");
                    if (err.status === 400) $("#error").html("Internal server error, please try again.");
                    else if (err.status === 403) $("#error").html("Only png and jpeg files are accepted");
                });

            }).catch((err) => { $("#error").html("Internal server error, please try again."); });
        }
        else {

            submitText();
        }
    });

    $("#cancel_post_edit").click(() => { window.location.href = "/admin" });
});

function submitText(cube, originalSize) {

    if ($("#file").prop("files").length > 0) {

        let name = $("#file").prop("files")[0].name.split(".");
        let thumbPath = `https://cloud-cube.s3.amazonaws.com/${cube}/public/${name[0]}_thumb.${name[1]}`;
        let path = `https://cloud-cube.s3.amazonaws.com/${cube}/public/${$("#file").prop("files")[0].name}`;
        let title = $("#post_title").val();
        let description = $("#post_desc").val();
        let size = $("#post_size").val();
        let pid = $(location).attr("pathname").split("/")[3];
        var oSize = originalSize;

        $.ajax({url: "editPost", type: "POST", async: false,
                data: { title: title,
                        description: description,
                        size: size,
                        pid: pid,
                        path: path,
                        thumbPath: thumbPath,
                        originalSize: originalSize }})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });

    } else {

        let title = $("#post_title").val();
        let description = $("#post_desc").val();
        let size = $("#post_size").val();
        let pid = $(location).attr("pathname").split("/")[3];

        $.ajax({url: "editPost", type: "POST", async: false,
                data: { title: title,
                        description: description,
                        size: size,
                        pid: pid }})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    }
}
