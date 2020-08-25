$(document).ready(() => {

    $("#submit_pricing").click(() => {

        let price = $("#base_price").val();
        let mult = $("#ratio_mult").val();

        $.ajax({url: "trueSize", type: "POST", async: false, data: {price: price, mult: mult}})
        .done((res) => { window.location.href = "/admin/pricing"; })
        .catch((err) => { $("#error").html("Internal server error, please try again."); })
    });

    $("#cancel_pricing").click(() => { window.location.href = "/admin/pricing"; });
});
