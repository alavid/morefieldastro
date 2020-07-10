$(document).ready(() => {

    if (typeof Cookies.get("scroll") !== "undefined")
        window.scrollTo(0, Cookies.get("scroll"));

    $(document).scroll(() => {
        Cookies.set("scroll", $(document).scrollTop(), { expires: 1 });
    });

    var sortable = [];
    var postLists = $(".admin_post_container");
    for (i = 0; i < postLists.length; i++) {

        sortable[i] = new Sortable(postLists[i], {
            onEnd: function(evt) {

                var pid = evt.item.id.split("-")[1];
                var cid = $(`#pid-${pid}`).parent().attr("id").split("-")[1];

                $.ajax({ url: "reorder", type: "POST", async: false, data: { pid: pid, cid: cid, newIndex: evt.newIndex } })
                .catch((err) => { console.log(err); })
            }
        })
    }
});
