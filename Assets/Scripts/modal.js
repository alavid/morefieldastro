$(document).ready(() => {

    function close() {

        let loc = $(location).attr("pathname").split("/");

        for (var i = 0; i < loc.length; i++) {

            if (loc[i] === "pricing") {

                window.location.href = "/admin/pricing";
                break;
            }
            else if (i === loc.length - 1) window.location.href = "/admin";
        }
    }

    $("#submit").click(() => {

        let file = $(".modal_file").toArray();
        let inputs = $(".modal_field").toArray();
        let data = {};
        let name = $("#modal").attr("name").split("-");
        let dest = name[0];
        if (name.length > 1) data[name[1]] = parseInt(name[2]);

        if (file[0] && $(file[0]).prop("files").length > 0) {

            let fileData = $(file[0]).prop("files")[0];
            upload(fileData).then((res) => {

                inputs.forEach((object) => { data[$(object).attr("name")] = $(object).val(); });

                let fileName = fileData.name.split(".");

                data["thumbPath"] = `https://cloud-cube.s3.amazonaws.com/${res.cube}/public/${fileName[0]}_thumb.${fileName[1]}`;
                data["path"] = `https://cloud-cube.s3.amazonaws.com/${res.cube}/public/${fileData.name}`;
                data["collection"] = parseInt($(location).attr("pathname").split("/")[3]);

                $.ajax({url: dest, type: "POST", async: false, data: data})
                .done((res) => { close(); })
                .catch((err) => { $("#error").html("Internal server error, please try again."); });

            }).catch((err) => { $("#error").html("Upload error, please try again."); });
        }
        else {

            inputs.forEach((object) => {

                var val = $(object).val();

                if (!isNaN(val) && val.indexOf('.') !== -1) val = parseFloat(val).toFixed(2);

                data[$(object).attr("name")] = val;
            });

            $.ajax({url: dest, type: "POST", async: false, data: data})
            .done((res) => { close(); })
            .catch((err) => { $("#error").html("Internal server error, please try again."); });
        }
    });

    $("#cancel").click(() => { close(); });
})
