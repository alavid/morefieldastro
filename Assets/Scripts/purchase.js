$(document).ready(() => {

    $("#submit").click(() => {

        let purchase = $("#purchase_field").val();

        $.ajax({url: "/updateInfo", type: "POST", async: false, data: {type: "purchase", info: purchase}})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    });

    $("#cancel").click(() => { window.location.href = "/admin"; });
});
