$(document).ready(() => {

    $("#submit").click(() => {

        let title = $("#title_field").val();
        let intro = $("#intro_field").val();

        $.ajax({url: "/updateInfo", type: "POST", async: false,
                data: {type: "title", title: title, intro: intro}})
        .done((res) => { window.location.href = "/admin"; })
        .catch((err) => { $("$error").html("Internal server error, please try again."); });
    });

    $("#cancel").click(() => { window.location.href = "/admin"; });
});
