$(document).ready(() => {

    $(".delete_size").click((event) => {

        let sid = event.target.id.split("_")[1];

        $.ajax({url: "deleteSize", type: "POST", async: false, data: { sid: sid }})
        .done((res) => { window.location.href = "/admin/pricing"; })
        .catch((err) => { $("#error").html("Internal server error, please try again."); });
    });

    $(".delete_type").click((event) => {

        let ptid = event.target.id.split("_")[1];

        $.ajax({url: "deleteType", type: "POST", async: false, data: { ptid: ptid }})
        .done((res) => { window.location.href = "/admin/pricing"; })
        .catch((err) => { $("#error").html("Internal server error, please try again."); });
    });
});
