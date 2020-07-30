$(document).ready(() => {

    $("#submit").click(() => {

        if ($("#file").prop("files").length > 0) {

            var fileData = $("#file").prop("files")[0];
            var formData = new FormData;
            formData.append("file", fileData);

            $.ajax({url: "upload", type: "POST", dataType: "text", cache: false,
                    contentType: false, processData: false, data: formData})
            .done((res) => { submitText(JSON.parse(res).cube); })
            .catch((err) => {

                if (err.status === 400)
                    document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";

                else if (err.status === 403)
                    document.getElementById("error").innerHTML = "Only png and jpeg files are accepted.";
            });
        }
        else submitText();
    });

    $("#cancel").click(() => { window.location.href = "/admin"; });
});

function submitText(cube) {

    if ($("#file").prop("files").length > 0) {

        let path = `https://cloud-cube.s3.amazonaws.com/${cube}/public/${$("#file").prop("files")[0].name}`;
        let bio = $("#bio_field").val();

        $.ajax({url: "updateInfo", type: "POST", async: "false", data: {type: "about", path: path, bio: bio}})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    }
    else {

        let bio = $("#bio_field").val();

        $.ajax({url: "updateInfo", type: "POST", async: "false", data: {type: "about", bio: bio}})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    }
}
