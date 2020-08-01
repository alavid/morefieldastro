$(document).ready(() => {

    $("#submit").click(() => {

        let contact = $("#contact_field").val();

        $.ajax({url: "/updateInfo", type: "POST", async: false, data: {type: "contact", info: contact}})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    });

    $("#cancel").click(() => { window.location.href = "/admin"; });
});
