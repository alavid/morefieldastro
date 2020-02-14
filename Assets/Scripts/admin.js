////////////////////////////////////////////////////////////////////////////////
// ADMIN CONTROLS SCRIPT - Written by Alex Morefield (2020)                   //
// - POPULATE: Populates the page. displays and arranges all of the posts in  //
// | the system, with buttons to interact with them.                          //
// - EDITMODAL: Generates, and defines event listeners for a modal to edit    //
// | posts.                                                                   //
// | - Argument "id": The id of the post being edited.                        //
// - ADDMODAL: Generates, and defines event listeners for a modal to add      //
// | posts.                                                                   //
// | - Argument "collection": The collection the post is being inserted into  //
////////////////////////////////////////////////////////////////////////////////

window.onload = function() {

    let content = document.getElementById("admin-content");

    populate();

    /*content.innerHTML +=    "<p>Log into and an account with admin access to continue.</p>" +
                            "<form>" +
                            "   Email Address:<br>" +
                            "   <input type='text' id='email' name='Email'><br>" +
                            "   Password:<br>" +
                            "   <input type='password' id='password' name='Email'><br>" +
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
                console.log(JSON.stringify(err));
                alert(err.message);
            });
        }
    }*/
}

function populate() {

    let content = document.getElementById("admin-content");

    var data;

    postEditbuttons = [];
    addPostButtons = [];

    document.getElementById("shadow").style.display = 'none';

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
                                        "<button class='edit_post' onClick='editPost(this.id)' id='ep" + response.posts[n].pid + "'>Edit</button>" +
                                        "<button class='delete_post' onClick='deletePost(this.id)' id='dp" + response.posts[n].pid + "'>Delete</button>";

                    cols[i].appendChild(newPost);
                }
            }
            var addPostButton = document.createElement("button");
            addPostButton.setAttribute("class", "add_post");
            addPostButton.setAttribute("id", "ap" + response.collections[i].cid);
            addPostButton.setAttribute("onClick", "addPost(this.id)");
            addPostButton.innerHTML = "+";
            cols[i].appendChild(addPostButton);
        }
    }).catch(function(err) {
        alert(err.status);
    });
}



function editPost(id) {

    document.getElementById("shadow").style.display = 'block';

    var split = id.split("ep");
    var postID = split[1];

    //Get info for post edit modal
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

        //Construct modal
        var editModal = document.createElement("div");
        editModal.setAttribute("class", "post_modal");
        editModal.setAttribute("id", "post_edit_modal");

        editModal.innerHTML =   "<img class='thumbnail' src='" + response[0].image_loc + "'><br>" +
                                "<div id='error'></div>" +
                                "<p class='modal_thumb text'>Thumbnail</p><input type='file' id='file' name='file'><br>" +
                                "<p class='modal_title text'>Title</p><input type='text' id='post_title' name='title' value='" + response[0].title + "'><br>" +
                                "<p class='modal_desc text'>Description</p><textarea id='post_desc' name='description'>" + response[0].description + "</textarea><br>" +
                                "<p class='modal_price text'>Price</p><input type='text' id='post_price' name='price' value='" + response[0].price + "'><br>" +
                                "<button type='button' class='submit' id='submit_post_edit'>Submit</button>" +
                                "<button type='button' class='cancel' id='cancel_post_edit'>Cancel</button>";

        document.body.appendChild(editModal);

        //Create submit/cancel listeners
        submit = document.getElementById("submit_post_edit");
        cancel = document.getElementById("cancel_post_edit");

        submit.onclick = function() {

            if ($("#file").prop("files").length > 0) {

                var fileData = $("#file").prop("files")[0];
                var formData = new FormData;
                formData.append("file", fileData);

                $.ajax({
                    url: "upload",
                    dataType: "text",
                    cache: false,
                    contentType: false,
                    processData: false,
                    data: formData,
                    type: "POST",
                }).done(function(res) {

                    submitText(JSON.parse(res).cube);

                }).catch(function(err) {

                    if (err.status === 400) {
                        document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                    }

                    else if (err.status === 403) {
                        document.getElementById("error").innerHTML = "Only png and jpeg files are accepted.";
                    }
                });

            } else submitText();
        }

        cancel.onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.removeChild(document.getElementById("post_edit_modal"));
        }

        //Helper function for submiting text fields
        function submitText(cube) {

            if ($("#file").prop("files").length > 0) var path = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + $("#file").prop("files")[0].name;
            else var path = response[0].image_loc;
            var title = DOMPurify.sanitize(document.getElementById("post_title").value);
            var description = DOMPurify.sanitize(document.getElementById("post_desc").value);
            var price = DOMPurify.sanitize(document.getElementById("post_price").value);

            $.ajax({
                url: "DBRequest",
                type: "POST",
                async: false,
                data: { data:
                        JSON.stringify(
                        { query: "UPDATE post SET title = $1, description = $2, price = $3, image_loc = $5 WHERE pid = $4",
                          vars: [title, description, price, postID, path],
                          type: "update"})}
            }).done(function(res) {
                document.body.removeChild(document.getElementById("post_edit_modal"));
                populate();
            }).catch(function(err) {
                editModal.innerHTML += "<p class='error'>Internal server error, please try again.</p>";
            });
        }
    });
}



function addPost(collection) {

    document.getElementById("shadow").style.display = 'block';

    var split = collection.split("ap");
    var colID = split[1];

    var addModal = document.createElement("div");
    addModal.setAttribute("class", "post_modal");
    addModal.setAttribute("id", "post_add_modal");

    addModal.innerHTML =    "<div id='error'></div>" +
                            "<p class='modal_thumb text'>Thumbnail</p><input type='file' id='file' name='file'><br>" +
                            "<p class='modal_title text'>Title</p><input type='text' id='post_title' name='title'><br>" +
                            "<p class='modal_desc text'>Description</p><textarea id='post_desc' name='description'></textarea><br>" +
                            "<p class='modal_price text'>Price</p><input type='text' id='post_price' name='price'><br>" +
                            "<button type='button' class='submit' id='submit_post_edit'>Submit</button>" +
                            "<button type='button' class='cancel' id='cancel_post_edit'>Cancel</button>";

    document.body.appendChild(addModal);

    submit = document.getElementById("submit_post_edit");
    cancel = document.getElementById("cancel_post_edit");

    submit.onclick = function() {

        var fileData = $("#file").prop("files")[0];
        var formData = new FormData;
        formData.append("file", fileData);

        $.ajax({
            url: "upload",
            dataType: "text",
            cache: false,
            contentType: false,
            processData: false,
            data: formData,
            type: "POST",
        }).done(function(res) {

            submitText(JSON.parse(res).cube);

        }).catch(function(err) {

            if (err.status === 400) {
                document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
            }

            else if (err.status === 403) {
                document.getElementById("error").innerHTML = "Only png and jpeg files are accepted.";
            }
        });
    }

    cancel.onclick = function() {

        document.getElementById("shadow").style.display = 'none';
        document.body.removeChild(document.getElementById("post_add_modal"));
    }

    function submitText(cube) {

        var path = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + $("#file").prop("files")[0].name;
        var title = DOMPurify.sanitize(document.getElementById("post_title").value);
        var description = DOMPurify.sanitize(document.getElementById("post_desc").value);
        var price = DOMPurify.sanitize(document.getElementById("post_price").value);

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "INSERT INTO post(image_loc, title, description, collection, price) VALUES($5, $1, $2, $4, $3)",
                      vars: [title, description, price, colID, path],
                      type: "insert"})}
        }).done(function(res) {
            document.body.removeChild(document.getElementById("post_add_modal"));
            populate();
        }).catch(function(err) {
            editModal.innerHTML += "<p class='error'>Internal server error, please try again.</p>";
        });
    }
}



function deletePost(id) {

    document.getElementById("shadow").style.display = 'block';

    var split = id.split("dp");
    var postID = split[1];

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "SELECT title, image_loc FROM post WHERE pid = $1",
                  vars: [postID],
                  type: "get"})}
    }).done(function(response) {

        var confirmModal = document.createElement("div");
        confirmModal.setAttribute("class", "confirm_modal");
        confirmModal.setAttribute("id", "confirm_delete_modal");

        confirmModal.innerHTML =    "<div id='error'></div>" +
                                    "<p class='confirm_modal_text'>Are you sure you want to delete " + response[0].title + "?</p>" +
                                    "<button type='button' class='submit' id='submit_post_delete'>Yes</button>" +
                                    "<button type='button' class='cancel' id='cancel_post_delete'>No</button>";

        document.body.appendChild(confirmModal);

        submit = document.getElementById("submit_post_delete");
        cancel = document.getElementById("cancel_post_delete");

        submit.onclick = function() {

            $.ajax({
                url: "DBRequest",
                type: "POST",
                async: false,
                data: { data:
                        JSON.stringify(
                        { query: "DELETE FROM post WHERE pid = $1",
                          vars: [postID],
                          type: "delete"})}
            }).done(function(res) {

                $.ajax({
                    url: "delete",
                    type: "POST",
                    data: {data: JSON.stringify({fileName: response[0].image_loc})}
                }).done(function(res) {

                    document.body.removeChild(document.getElementById("confirm_delete_modal"));
                    populate();
                }).catch(function(err) {

                    document.getElementById("error").innerHTML = "Internal server error, please try again."
                });
            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error, please try again."
            });
        }

        cancel.onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.removeChild(document.getElementById("confirm_delete_modal"));
        }
    });
}
