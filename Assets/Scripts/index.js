window.onload = function() {

    let home = document.getElementById("home_button");
    let gallery = document.getElementById("gallery_button");
    let about = document.getElementById("about_button");
    let contact = document.getElementById("contact_button");
    let purchase = document.getElementById("purchase_button");
    let nav = [home, gallery, about, contact, purchase];

    let content = document.getElementById("content");

    var selected = 0;

    document.getElementById("shadow").style.display = 'none';


    function populate(page) {

        content.innerHTML = "";
        nav[selected].classList.remove("selected");

        content.innerHTML = "<div class='error'></div>";

        if (page === "Home") {

            home.classList.add("selected");
            selected = 0;

            $.ajax({url: "DBRequest", type: "POST", async: false,
                    data: {data: JSON.stringify({
                        query: "SELECT cid, title, description FROM collection WHERE cid = (SELECT cid FROM collection WHERE featured = true)",
                        vars: [],
                        type: "get"
                    })}
            }).done(function(collection) {

                content.innerHTML +=    "<h3 id='feat_title' class='text'>" + collection[0].title + "</h3>" +
                                        "<p id='feat_desc' class='text'>" + collection[0].description + "</p>";

                $.ajax({url: "DBRequest", type: "POST", async: false,
                    data: {data: JSON.stringify({
                        query: "SELECT title, description, image_loc FROM post WHERE collection = $1",
                        vars: [collection[0].cid],
                        type: "get"
                    })}
                }).done(function(posts) {

                    for (i = 0; i < posts.length; i++) {

                        if ((i + 1) % 2 === 1) {
                            content.innerHTML +=    "<div class='feat_entry'>" +
                                                    "   <div class='feat_entry_img'><img class='feat_thumb' src='" + posts[i].image_loc + "'></div>" +
                                                    "   <div class='feat_entry_info right'>" +
                                                    "       <h4 class='feat_entry_title text'>" + posts[i].title + "</h4>" +
                                                    "       <p class='feat_entry_desc text block'>" + posts[i].description + "</p>"
                                                    "   </div>" +
                                                    "</div>";
                        }
                        else {
                            content.innerHTML +=    "<div class='feat_entry'>" +
                                                    "   <div class='feat_entry_info left'>" +
                                                    "       <h4 class='feat_entry_title text'>" + posts[i].title + "</h4>" +
                                                    "       <p class='feat_entry_desc text block'>" + posts[i].description + "</p>" +
                                                    "   </div>" +
                                                    "   <div class='feat_entry_img'><img class='feat_thumb' src='" + posts[i].image_loc + "'></div>" +
                                                    "</div>";
                        }
                    }

                }).catch(function(err) {

                    document.getElementById("error").innerHTML = "Internal server error. Please reload the page.";
                });

            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error. Please reload the page.";
            });
        }
        else if (page === "Gallery") {

            gallery.classList.add("selected");
            selected = 1;

            $.ajax({
                url: "getEntries",
                type: "POST",
                async: false,
                data: {}
            }).done(function(response) {

                content.innerHTML = "";
                cols = [];

                for (i = 0; i < response.collections.length; i++) {

                    if (response.collections[i].featured === false) {

                        content.innerHTML +=    "<div class='col_container' id='" + response.collections[i].cid + "'>" +
                                                "   <div id='col_info'>" +
                                                "       <h2 class='text'>" + response.collections[i].title + "</h2>" +
                                                "       <p class='text col_desc'>" + response.collections[i].description + "</p>" +
                                                "   </div>" +
                                                "   <div class='post_container' id='pc_" + response.collections[i].cid + "'></div>" +
                                                "</div>";

                        cols[i] = document.getElementById("pc_" + response.collections[i].cid);

                        for (n = 0; n < response.posts.length; n++) {

                            if (response.posts[n].collection === response.collections[i].cid) {

                                var newPost = document.createElement("div");
                                newPost.setAttribute("class", "gallery_post");
                                newPost.setAttribute("id", "post" + response.posts[n].pid);
                                newPost.setAttribute("onClick", "openModal(this.id)");

                                newPost.innerHTML = "<img class='thumbnail' src='" + response.posts[n].image_loc + "'>" +
                                                    "<h3 class='text'>" + response.posts[n].title + "</h3>";

                                cols[i].appendChild(newPost);
                            }
                        }
                    }
                }
            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error. Please reload the page.";
            });
        }
        else if (page === "About") {

            about.classList.add("selected");
            selected = 2;

            $.ajax({url: "DBRequest", type: "POST", async: false,
                    data: {data: JSON.stringify({
                        query: "SELECT about_img_loc, about FROM basic_info WHERE bid = 0",
                        vars: [],
                        type: "get"
                    })}
            }).done(function(info) {

                content.innerHTML += "<div id='about'>" +
                                    "   <div id='about_photo'>" +
                                    "       <img id='about_thumb' src='" + info[0].about_img_loc + "'>" +
                                    "   </div>" +
                                    "   <div id='about_text'>" +
                                    "       <p id=bio_text class='text'>" + info[0].about + "</p>" +
                                    "   </div>" +
                                    "</div>";

            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error. Please reload the page.";
            });
        }
        else if (page === "Contact") {

            contact.classList.add("selected");
            selected = 3;

            $.ajax({url: "DBRequest", type: "POST", async: false,
                    data: {data: JSON.stringify({
                        query: "SELECT contact FROM basic_info WHERE bid = 0",
                        vars: [],
                        type: "get"
                    })}
            }).done(function(info) {

                content.innerHTML += "<div id='contact' class='text'><p class='block'>" + info[0].contact + "</p></div>";

            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error. Please reload the page.";
            });
        }
        else if (page === "Purchase") {

            purchase.classList.add("selected");
            selected = 4;

            $.ajax({url: "DBRequest", type: "POST", async: false,
                    data: {data: JSON.stringify({
                        query: "SELECT purchase FROM basic_info WHERE bid = 0",
                        vars: [],
                        type: "get"
                    })}
            }).done(function(info) {

                content.innerHTML += "<div id='purchase' class='text'><p class='block'>" + info[0].purchase + "</p></div>";

            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error. Please reload the page.";
            });
        }
    }

    home.onclick = () => populate("Home");
    gallery.onclick = () => populate("Gallery");
    about.onclick = () => populate("About");
    contact.onclick = () => populate("Contact");
    purchase.onclick = () => populate("Purchase");

    populate("Home");
}

function openModal(id) {

    document.getElementById("shadow").style.display = 'block';
    document.body.style.overflow = "hidden";

    var split = id.split("post");
    var postID = split[1];

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "SELECT * FROM post WHERE pid = $1",
                  vars: [postID],
                  type: "get"})}
    }).done(function(response) {

        var modal = document.createElement("Modal");
        modal.setAttribute("class", "modal");
        modal.setAttribute("id", "post_disp_modal");

        modal.innerHTML =   "<button type='button' id='close'><i class='fas fa-times'></i></button>" +
                            "<div id='modal-content'>" +
                            "   <img class='thumbnail' src='" + response[0].image_loc + "'><br>" +
                            "   <div id='modal_info'>" +
                            "       <h2 class='modal_title text'>" + response[0].title + "</h2>" +
                            "       <p class='modal_desc text'>" + response[0].description + "</p>" +
                            "       <p class='modal_size text'>Max Size: " + response[0].size + "</p>" +
                            "   </div>"
                            "</div>";

        document.body.appendChild(modal);

        document.getElementById("close").onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.style.overflow = "auto";
            document.body.removeChild(document.getElementById("post_disp_modal"));
        }

    }).catch(function(err) {

    });
}
