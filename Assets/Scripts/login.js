window.onload = () => {

    $("#login_button").click(() => {

        var email = $("#email").val();
        var password = $("#password").val();

        if (email !== "" && password !== "") {

            $.ajax({url: "logIn", type: "POST", async: false,
                    data: {email: email, password: password}
            }).done((res) => {

                console.log(JSON.stringify(res));

                if (res.authorized) {

                    location.reload();
                }
                else $("#error").html(res.message);

            }).catch((err) => {

                $("error").html("Internal server error, please try again."); 
            });
        }
        else {

            $("#error").html("Failure: Both fields required.");
        }
    });
}
