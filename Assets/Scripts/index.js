var isHome = false; //Keeps track of whether we're on the home page.

//This function controls what happens when the back/forward buttons are pressed.
window.onpopstate = function(e) {

    if (e.state) {

        //We set the current page HTML to the last stored page state.
        document.title = e.state.title;
        document.body.innerHTML = e.state.state.content;

        if (e.state.state.page === "home") isHome = true;
        else isHome = false;

        setNav();
    }
    else {

        var error = createElement("div");
        error.setAttribute("id", "error");
        error.innerHTML = "Browser error. Please reload the page.";

        document.body.appendChild(error);
    }
}

//Otherwise, on a normal page load, we run this function.
window.onload = function() {

    document.getElementById("shadow").style.display = 'none';

    setNav();

    loadHome();
}

//This function sets up the functionality of the nav bar.
function setNav() {

    let home = document.getElementById("home_button");
    let about = document.getElementById("about_button");
    let contact = document.getElementById("contact_button");
    let purchase = document.getElementById("purchase_button");

    home.onclick = () => {

        if (!isHome) loadHome();
        window.scrollTo(0,0);
    }

    about.onclick = () => {

        if (!isHome) loadHome();
        document.getElementById("about").scrollIntoView();
    }

    contact.onclick = () => {

        if (!isHome) loadHome();
        document.getElementById("contact").scrollIntoView();
    }

    purchase.onclick = () => {

        if (!isHome) loadHome();
        document.getElementById("purchase").scrollIntoView();
    }
}

//This function generates the home page.
function loadHome() {

    window.scrollTo(0,0);

    isHome = true;

    let content = document.getElementById("content");
    content.innerHTML = "";

    //First, we request title info from the server and construct the title block.
    $.ajax({url: "DBRequest", type: "POST", async: false,
            data: {data: JSON.stringify({
                query: `SELECT title, intro FROM basic_info`,
                vars: [],
                type: "get"
            })}
    }).done(function(title) {

        content.innerHTML += `<div id='title_block'>
                                <h3 id='title' class='text'>${title[0].title}</h3>
                                <p id='intro' class='text'>${title[0].intro}</p>
                              </div>`;

        var collections = document.createElement("div");
        collections.setAttribute("id", "collections");

        content.innerHTML += `<h3 id="cols_title" class="text">Collections</h3>`;

        //Then, we get info for all of the collections to display.
        $.ajax({url: "DBRequest", type: "POST", async: false,
            data: {data: JSON.stringify({
                   query: `SELECT collection.cid, collection.title, collection.description, post.image_loc
                           FROM post, collection
                           WHERE collection.cid = post.collection AND post.index = (
                               SELECT MIN(post.index)
                               FROM post, collection
                               WHERE post.collection = collection.cid
                           )`,
                   vars: [],
                   type: "get"
            })}
        }).done(function(res) {

            for (var i = 0; i < res.length; i++) {

                var thumb = document.createElement("div");
                thumb.setAttribute("id", `thumb${res[i].cid}`);
                thumb.setAttribute("class", "thumb");
                thumb.style.backgroundImage = `url("${res[i].image_loc}")`;

                var thumbButton = document.createElement("button");
                thumbButton.setAttribute("id", `thumbButton${res[i].cid}`);
                thumbButton.setAttribute("class", "thumbButton");
                thumbButton.setAttribute("onClick", `loadGallery(${res[i].cid})`);
                thumbButton.innerHTML = `${res[i].title}`;

                thumb.appendChild(thumbButton);
                collections.appendChild(thumb);
            }

            content.appendChild(collections);

            //Last, we get the info for the footer.
            $.ajax({url: "DBRequest", type: "POST", async: false,
                    data: {data: JSON.stringify({
                            query: `SELECT * FROM basic_info`,
                            vars: [],
                            type: "get"
                    })}
            }).done(function(info) {

                var footer = document.createElement("div");
                footer.setAttribute("id", "footer");

                var about = document.createElement("div");
                about.setAttribute("id", "about");
                about.innerHTML =   `<div id='about_photo'>
                                            <img id='about_thumb' src='${info[0].about_img_loc}'>
                                        </div>`;

                var otherInfo = document.createElement("div");
                otherInfo.setAttribute("id", "otherInfo");
                otherInfo.innerHTML =    `  <div id='about_text'>
                                                <p id=bio_text class='text'>${info[0].about}</p>
                                            </div>
                                            <div id='purchase' class='text'>
                                                <p class='block'>${info[0].purchase}</p>
                                            </div>
                                            <div id='contact' class='text'>
                                                <p class='block'>${info[0].contact}</p>
                                            </div>
                                            <p class='text'>© Kevin Morefield 2020</p>`;

                footer.appendChild(about);
                footer.appendChild(otherInfo);

                content.appendChild(footer);

                history.pushState({
                    title: document.title,
                    state: {page: "home", content: document.body.innerHTML}
                }, document.title);

            }).catch(function() {

                var error = createElement("div");
                error.setAttribute("id", "error");
                error.innerHTML = "Internal server error. Please reload the page.";

                content.appendChild(error);
                return;
            });

        }).catch(function(err) {

            var error = createElement("div");
            error.setAttribute("id", "error");
            error.innerHTML = "Internal server error. Please reload the page.";

            content.appendChild(error);
            return;
        });

    }).catch(function(err) {

        var error = createElement("div");
        error.setAttribute("id", "error");
        error.innerHTML = "Internal server error. Please reload the page.";

        content.appendChild(error);
        return;
    });
}

//This function generates a gallery for a selected collection.
function loadGallery(col) {

    window.scrollTo(0,0);

    isHome = false;

    let content = document.getElementById("content");
    content.innerHTML = "";

    var collection = document.createElement("div");
    collection.setAttribute("class", "col_container");

    var postContainer = document.createElement("div");
    postContainer.setAttribute("class", "post_container");

    $.ajax({url: "DBRequest", type: "POST", async: false,
            data: {data: JSON.stringify({
                query: `SELECT post.title AS post_title, * FROM post, collection WHERE post.collection = $1 AND collection.cid = $1 ORDER BY post.index`,
                vars: [col],
                type: "get"
            })}
    }).done(function(res) {

        collection.innerHTML += `<div id="col_info">
                                    <h2 class="text gall_title">${res[0].title}</h2>
                                    <p class="text gall_desc">${res[0].description}</p>
                                 </div>`;

        for (i = 0; i < res.length; i++) {

            var newPost = document.createElement("div");
            newPost.setAttribute("class", "gallery_post");
            newPost.setAttribute("id", `post${res[i].pid}`);
            newPost.setAttribute("onClick", "openModal(this.id)");

            var thumb = document.createElement("div");
            thumb.setAttribute("class", "gall_thumb");
            thumb.style.backgroundImage = `url("${res[i].thumbnail_loc}")`;

            newPost.appendChild(thumb);
            newPost.innerHTML += `<h3 class="text gallery_post_title">${res[i].post_title}</h3>`;

            //newPost.innerHTML = `<img class="thumbnail" src="${res[i].thumbnail_loc}">
            //                     <h3 class="text gallery_post_title">${res[i].post_title}</h3>`;

            postContainer.appendChild(newPost);
        }

        collection.appendChild(postContainer);
        content.appendChild(collection);

        history.pushState({
            title: document.title,
            state: {page: "gallery", content: document.body.innerHTML}
        }, document.title);

    }).catch(function(err) {

        var error = createElement("div");
        error.setAttribute("id", "error");
        error.innerHTML = "Internal server error. Please reload the page.";

        content.appendChild(error);
    });
}

//This function generates a modal for a selected post.
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

        var image = new Image();
        image.src = response[0].image_loc;
        image.setAttribute("class", "thumbnail");

        image.onload = function() {

            var oHeight = image.height;
            var oWidth = image.width;
            var width;

            if (oHeight > 700) width = 700 * (oWidth / oHeight);
            else width = oWidth;

            var modal = document.createElement("Modal");
            modal.setAttribute("id", "post_disp_modal");

            modal.innerHTML =   "<div id='close'><i class='fas fa-times' id='close_button'></i></div>" +
                                "<div id='modal_content'>" +
                                "   <div id='modal_thumb'></div>" +
                                "   <div id='modal_info'>" +
                                "       <h2 class='modal_title text'>" + response[0].title + "</h2>" +
                                "       <p class='modal_desc text'>" + response[0].description + "</p>" +
                                "       <p class='modal_size text'>Max Size: " + response[0].size + "</p>" +
                                "   </div>"
                                "</div>";

            document.body.appendChild(modal);
            document.getElementById("modal_thumb").appendChild(image);
            document.getElementById("modal_thumb").style.maxWidth = width + "px";

            document.getElementById("close_button").onclick = function() {

                document.getElementById("shadow").style.display = 'none';
                document.body.style.overflow = "auto";
                document.body.removeChild(document.getElementById("post_disp_modal"));
            }
        }

    }).catch(function(err) {

    });
}
