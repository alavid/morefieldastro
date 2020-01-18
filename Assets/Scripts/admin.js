window.onload = function() {

    let content = document.getElementById("admin-content");

    populate();

    /*content.innerHTML +=    "<p>Log into and an account with admin access to continue.</p>" +
                            "<form>" +
                            "   Email Address:<br>" +
                            "   <input type='text' id='email' name='Email'><br>" +
                            "   Password:<br>" +
                            "   <input type='text' id='password' name='Email'><br>" +
                            "   <button type='button' id='LogIn'>Log In</button>" +
                            "</form>";

    let logInButton = document.getElementById("LogIn");
    let emailField = document.getElementById("email");
    let passwordField = document.getElementById("password");

    logInButton.onclick = function() {

        if (emailField.value != "" && passwordField.value != "") {
            $.ajax({
                url: "logIn",
                type: "POST",
                async: false,
                data: {
                    email: emailField.value,
                    password: passwordField.value
                }
            }).done(function(response) {
                if (response.authorize) populate();
                else alert("You don't have access");
            }).catch(function(err) {
                alert(err.status);
            });
        }
    }*/
}

function populate() {

    let content = document.getElementById("admin-content");

    var data;

    postEditbuttons = [];
    addPostButtons = [];

    $.ajax({
        url: "getEntries",
        type: "POST",
        async: false,
        data: {}
    }).done(function(response) {

        content.innerHTML = "";
        cols = [];

        for (i = 0; i < response.collections.length; i++) {

            content.innerHTML +=    "<div class='col_container' id='" + response.collections[i].cid + "'>" +
                                    "   <h2 class='text'>" + response.collections[i].title + "</h2>" +
                                    "   <p class='text col_desc'>" + response.collections[i].description + "</p>" +
                                    "   <div class='post_container' id='pc_" + response.collections[i].cid + "'></div>" +
                                    "</div>";

            cols[i] = document.getElementById("pc_" + response.collections[i].cid);

            for (n = 0; n < response.posts.length; n++) {

                if (response.posts[n].collection === response.collections[i].cid) {

                    var newPost = document.createElement("div");
                    newPost.setAttribute("class", "post");
                    newPost.setAttribute("id", "post" + response.posts[n].pid);

                    newPost.innerHTML = "<img class='thumbnail' src='" + response.posts[n].image_loc + "'>" +
                                        "<h3 class='text'>" + response.posts[n].title + "</h3>" +
                                        "<button class='edit_post' onClick='editPost(this.id)' id='ep" + response.posts[n].pid + "'>Edit</button>";

                    cols[i].appendChild(newPost);
                }
            }
            var addPostButton = document.createElement("button");
            addPostButton.setAttribute("class", "add_post");
            addPostButton.setAttribute("id", "ap" + response.collections[i].cid);
            addPostButton.innerHTML = "+";
            cols[i].appendChild(addPostButton);
        }
    }).catch(function(err) {
        alert(err.status);
    });
}

function editPost(id) {

    let content = document.getElementById("admin-content");

    var split = id.split("ep");
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

        var editModal = document.createElement("div");
        editModal.setAttribute("class", "post_modal");
        editModal.setAttribute("id", "post_edit_modal");

        editModal.innerHTML =   "Title<input type='text' id='post_title' name='title' value='" + response[0].title + "'><br>" +
                                "Description<input type='text' id='post_desc' name='description' value='" + response[0].description + "'><br>" +
                                "Price<input type='text' id='post_price' name='price' value='" + response[0].price + "'><br>" +
                                "<button class='submit' id='submit_post_edit'>Submit</button>" +
                                "<button class='cancel' id='cancel_post_edit'>Cancel</button>";

        content.appendChild(editModal);
    });

    submit = document.getElementById("submit_post_edit");
    cancel = document.getElementById("cancel_post_edit");

    submit.onclick = function() {

        var title = document.getElementById("post_title").value;
        var description = document.getElementById("post_desc").value;
        var price = document.getElementById("post_price").value;

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "UPDATE post SET title = $1, description = $2, price = $3 WHERE pid = $4",
                    vars: [title, description, price, postID],
                    type: "update"})}
        }).done(function(response) {
            content.removeChild(document.getElementById("post_edit_modal"));
            populate();
        });
    }

    cancel.onclick = function() { content.removeChild(document.getElementById("post_edit_modal")); }
}
