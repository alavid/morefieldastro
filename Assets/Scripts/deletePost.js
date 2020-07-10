$(document).ready(() => {

    $("#submit_post_delete").click(() => {

        let pid = $(location).attr("pathname").split("/")[3];

        $.ajax({url: "deletePost", type: "POST", data: {pid: pid}})
        .then(() => { window.location.href = "/admin" })
        .catch(() => { $("#error").html("Internal server error, please try again.") });
    });

    $("#cancel_post_delete").click(() => { window.location.href = "/admin" });
});
