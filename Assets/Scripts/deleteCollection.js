$(document).ready(() => {

    $("#submit_col_delete").click(() => {

        let cid = $(location).attr("pathname").split("/")[3];

        $.ajax({url: "deleteCollection", type: "POST", async: false, data: { cid: cid }})
        .done((res) => { window.location.href = "/admin" })
        .catch((err) => { $("#error").html("Internal server error, please try again.") });
    });

    $("#cancel_col_delete").click(() => { window.location.href = "/admin" });
});
