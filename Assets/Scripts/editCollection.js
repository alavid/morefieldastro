$(document).ready(() => {

    $("#submit_col").click(() => {

        let cid = $(location).attr("pathname").split("/")[3];
        let title = $("#col_title").val();
        let description = $("#col_desc").val();

        $.ajax({url: "editCollection", type: "POST", async: false, data: { cid: cid, title: title, description: description }})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    });

    $("#cancel_col").click(() => { window.location.href = "/admin"; });
});
