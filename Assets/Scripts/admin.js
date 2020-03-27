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

    //populate();

    content.innerHTML +=    "<p>Log into and an account with admin access to continue.</p>" +
                            "<p id='error' class='text'></p>" +
                            "<form id='login' class='text'>" +
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
                else if (response.message === "Failure: Incorrect password") document.getElementById("error").innerHTML = response.message;
                else document.getElementById("error").innerHTML = "You don't have access";
            }).catch(function(err) {

                error = JSON.parse(err.responseText).message

                document.getElementById("error").innerHTML = error;
            });
        }
    }
}

function populate() {

    let content = document.getElementById("admin-content");

    var data;

    postEditbuttons = [];
    addPostButtons = [];

    document.getElementById("shadow").style.display = 'none';
    document.body.style.overflow = "auto";

    content.innerHTML = "";

    content.innerHTML +=    "<div id='basic_info_buttons'>" +
                            "   <button class='basic_info_button' id='about_button'>About Info</button>" +
                            "   <button class='basic_info_button' id='contact_button'>Contact Info</button>" +
                            "   <button class='basic_info_button' id='purchase_button'>Purchase Info</button>" +
                            "</div>";

    document.getElementById("about_button").setAttribute("onClick", "basicInfo('About')");
    document.getElementById("contact_button").setAttribute("onClick", "basicInfo('Contact')");
    document.getElementById("purchase_button").setAttribute("onClick", "basicInfo('Purchase')");

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "SELECT cid FROM collection WHERE featured = true",
                  vars: [],
                  type: "get"})}
    }).done(function(feat) {

        $.ajax({
            url: "getEntries",
            type: "POST",
            async: false,
            data: {}
        }).done(function(response) {

            cols = [];

            for (i = 0; i < response.collections.length; i++) {

                content.innerHTML +=    "<div class='col_container' id='" + response.collections[i].cid + "'>" +
                                        "   <div id='col_header'>" +
                                        "       <div id='col_info'>" +
                                        "           <h2 class='text'>" + response.collections[i].title + "</h2>" +
                                        "           <p class='text col_desc'>" + response.collections[i].description + "</p>" +
                                        "       </div>" +
                                        "       <div class='col_buttons' id='cb" + response.collections[i].cid + "'>" +
                                        "           <button class='edit_button edit_col_button' onClick='editCollection(this.id)' id='ec" + response.collections[i].cid + "'>Edit</button>" +
                                        "           <button class='delete_button delete_col_button' onClick='deleteCollection(this.id)' id='dc" + response.collections[i].cid + "'>Delete</button>" +
                                        "       </div>" +
                                        "   </div>" +
                                        "   <ul class='post_container' id='pc" + response.collections[i].cid + "'></ul>" +
                                        "</div>";

                if (response.collections[i].cid === feat[0].cid) {

                    var featNote = document.createElement("button");
                    featNote.setAttribute("class", "feat_note");

                    featNote.innerHTML = "<i>Featured</i>";

                    var colButtons = document.getElementById("cb" + response.collections[i].cid);
                    colButtons.insertBefore(featNote, colButtons.firstChild);
                }
                else {

                    var featButton = document.createElement("button");
                    featButton.setAttribute("class", "edit_button edit_col_button");
                    featButton.setAttribute("id", "fb" + response.collections[i].cid);
                    featButton.setAttribute("onClick", "feature(this.id)");

                    featButton.innerHTML = "Feature";

                    var colButtons = document.getElementById("cb" + response.collections[i].cid);
                    colButtons.insertBefore(featButton, colButtons.firstChild);
                }

                cols[i] = document.getElementById("pc" + response.collections[i].cid);

                for (n = 0; n < response.posts.length; n++) {

                    if (response.posts[n].collection === response.collections[i].cid) {

                        var newPost = document.createElement("li");
                        newPost.setAttribute("class", "post");
                        newPost.setAttribute("id", "post" + response.posts[n].pid);

                        newPost.innerHTML = "<img class='thumbnail' src='" + response.posts[n].thumbnail_loc + "'>" +
                                            "<h3 class='text'>" + response.posts[n].title + "</h3>" +
                                            "<button class='edit_button' onClick='editPost(this.id)' id='ep" + response.posts[n].pid + "'>Edit</button>" +
                                            "<button class='delete_button' onClick='deletePost(this.id)' id='dp" + response.posts[n].pid + "'>Delete</button>";

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

            var addColButton = document.createElement("button");
            addColButton.setAttribute("id", "add_col");
            addColButton.setAttribute("onClick", "addCollection()");
            addColButton.innerHTML = "Add Collection";
            content.appendChild(addColButton);

            var sortable = [];
            var postLists = document.getElementsByClassName("post_container");
            for (i = 0; i < postLists.length; i++) {

                sortable[i] = new Sortable(postLists[i], {
                    onEnd: function(evt) {

                        var split = evt.item.id.split("post");
                        var pid = split[1];

                        $.ajax({
                            url: "DBRequest",
                            type: "POST",
                            async: false,
                            data: { data:
                                    JSON.stringify(
                                    { query: "SELECT collection FROM post WHERE pid = $1",
                                      vars: [pid],
                                      type: "get"})}
                        }).done(function(data) {
                            $.ajax({
                                url: "DBRequest",
                                type: "POST",
                                async: false,
                                data: { data:
                                        JSON.stringify(
                                        { query: "UPDATE post SET index = $1 WHERE pid = $2",
                                          vars: [evt.newIndex, pid],
                                          type: "update"})}
                            }).done(function(res) {
                                $.ajax({
                                    url: "DBRequest",
                                    type: "POST",
                                    async: false,
                                    data: { data:
                                            JSON.stringify(
                                            { query: "UPDATE post SET index = index + 1 WHERE collection = $1 AND index >= $2 AND pid != $3",
                                              vars: [data[0].collection, evt.newIndex, pid],
                                              type: "update"})}});
                            });
                        });
                    }
                })
            }

        }).catch(function(err) {
            alert(err.status);
        });
    });
}

function resize( fileData, type ) {

    return new Promise( function( resolve, reject ) {

        var fileName;
        var newWidth;

        if (type === "normal") {

            fileName = fileData.name;
            newWidth = 1000;

        } else {

            var split = fileData.name.split(".");
            fileName = split[0] + "_thumb" + "." + split[1];
            newWidth = 300;
        }

        const reader = new FileReader();
        reader.readAsDataURL(fileData);

        reader.onload = function(event) {

            const img = new Image();
            img.src = event.target.result;

            img.onload = function() {

                const width = newWidth;
                const height = (width / img.width) * img.height;
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d");
                context.drawImage(img, 0, 0, width, height);

                //Create image file from canvas

                context.canvas.toBlob( function(blob) {
                    const file = new File([blob], fileName, {

                        type: "image/jpeg",
                        lastModified: Date.now()
                    });

                    resolve(file);

                }, "image/jpeg", 1);

                reader.onerror = function(err) {

                    reject(err);
                }
            }
        }

    });
}

function editPost(id) {

    document.getElementById("shadow").style.display = 'block';
    document.body.style.overflow = "hidden";

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
        editModal.setAttribute("class", "modal");
        editModal.setAttribute("id", "post_edit_modal");

        editModal.innerHTML =   "<img class='thumbnail' src='" + response[0].image_loc + "'><br>" +
                                "<div id='error'></div>" +
                                "<p class='modal_thumb text'>Thumbnail</p><input type='file' id='file' name='file'><br>" +
                                "<p class='modal_field_label text'>Title</p><input type='text' id='post_title' name='title' value='" + response[0].title + "'><br>" +
                                "<p class='modal_field_label text'>Description</p><textarea id='post_desc' name='description'>" + response[0].description + "</textarea><br>" +
                                "<p class='modal_field_label text'>Max Size</p><input type='text' id='post_size' name='size' value='" + response[0].size + "'><br>" +
                                "<button type='button' class='submit' id='submit_post_edit'>Submit</button>" +
                                "<button type='button' class='cancel' id='cancel_post_edit'>Cancel</button>";

        document.body.appendChild(editModal);

        //Create submit/cancel listeners
        submit = document.getElementById("submit_post_edit");
        cancel = document.getElementById("cancel_post_edit");

        submit.onclick = function() {

            if ($("#file").prop("files").length > 0) {

                var fileData = $("#file").prop("files")[0];

                var file = resize(fileData, "normal");

                file.then(function(file) {

                    var formData = new FormData;
                    formData.append("file", file);

                    $.ajax({
                        url: "upload",
                        dataType: "text",
                        cache: false,
                        contentType: false,
                        processData: false,
                        data: formData,
                        type: "POST",
                    }).done(function(res) {

                        var thumb = resize(fileData, "thumbnail")

                        thumb.then(function(file) {

                            var thumbData = new FormData;
                            thumbData.append("file", file);

                            $.ajax({
                                url: "upload",
                                dataType: "text",
                                cache: false,
                                contentType: false,
                                processData: false,
                                data: thumbData,
                                type: "POST",
                            }).done(function(res) {

                                submitText(JSON.parse(res).cube);

                            }).catch(function(err) {

                                document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                            });
                        })

                        thumb.catch(function(err) {

                            document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                        });

                    }).catch(function(err) {

                        if (err.status === 400) {
                            document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                        }

                        else if (err.status === 403) {
                            document.getElementById("error").innerHTML = "Only png and jpeg files are accepted.";
                        }
                    });
                });

                file.catch(function(err) {

                    document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                })

            } else submitText();
        }

        cancel.onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.style.overflow = "auto";
            document.body.removeChild(document.getElementById("post_edit_modal"));
        }

        //Helper function for submiting text fields
        function submitText(cube) {

            if ($("#file").prop("files").length > 0) {

                var split = $("#file").prop("files")[0].name.split(".");
                var thumbPath = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + split[0] + "_thumb" + "." + split[1];
                var path = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + $("#file").prop("files")[0].name;

            } else {

                var thumbPath = response[0].thumbnail_loc;
                var path = response[0].image_loc;
            }
            var title = document.getElementById("post_title").value;
            var description = document.getElementById("post_desc").value;
            var size = document.getElementById("post_size").value;

            $.ajax({
                url: "DBRequest",
                type: "POST",
                async: false,
                data: { data:
                        JSON.stringify(
                        { query: "UPDATE post SET title = $1, description = $2, size = $3, image_loc = $5, thumbnail_loc = $6 WHERE pid = $4",
                          vars: [title, description, size, postID, path, thumbPath],
                          type: "update"})}
            }).done(function(res) {
                document.body.removeChild(document.getElementById("post_edit_modal"));
                populate();
            }).catch(function(err) {
                document.getElementById("error").innerHTML = "Internal server error, please try again.";
            });
        }
    });
}

function addPost(collection) {

    document.getElementById("shadow").style.display = 'block';
    document.body.style.overflow = "hidden";

    var split = collection.split("ap");
    var colID = split[1];

    var addModal = document.createElement("div");
    addModal.setAttribute("class", "modal");
    addModal.setAttribute("id", "post_add_modal");

    addModal.innerHTML =    "<div id='error'></div>" +
                            "<p class='modal_thumb text'>Thumbnail</p><input type='file' id='file' name='file'><br>" +
                            "<p class='modal_field_label text'>Title</p><input type='text' id='post_title' name='title'><br>" +
                            "<p class='modal_field_label text'>Description</p><textarea id='post_desc' name='description'></textarea><br>" +
                            "<p class='modal_field_label text'>Max Size</p><input type='text' id='post_size' name='size'><br>" +
                            "<button type='button' class='submit' id='submit_post'>Submit</button>" +
                            "<button type='button' class='cancel' id='cancel_post'>Cancel</button>";

    document.body.appendChild(addModal);

    submit = document.getElementById("submit_post");
    cancel = document.getElementById("cancel_post");

    submit.onclick = function() {

        //Upload image.

        var fileData = $("#file").prop("files")[0];

        var image = resize(fileData, "normal");

        image.then(function(file) {

            var formData = new FormData;
            formData.append("file", file);

            $.ajax({
                url: "upload",
                dataType: "text",
                cache: false,
                contentType: false,
                processData: false,
                data: formData,
                type: "POST",
            }).done(function(res) {

                var thumb = resize(fileData, "thumbnail");

                thumb.then(function(file) {

                    var thumbData = new FormData;
                    thumbData.append("file", file);

                    $.ajax({
                        url: "upload",
                        dataType: "text",
                        cache: false,
                        contentType: false,
                        processData: false,
                        data: thumbData,
                        type: "POST",
                    }).done(function(res) {

                        submitText(JSON.parse(res).cube);

                    }).catch(function(err) {

                        document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                    });
                });

                thumb.catch(function(err) {

                    document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";

                });

            }).catch(function(err) {

                if (err.status === 400) {
                    document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
                }

                else if (err.status === 403) {
                    document.getElementById("error").innerHTML = "Only png and jpeg files are accepted.";
                }
            });
        })

        image.catch(function(err) {

            document.getElementById("error").innerHTML = "Internal server error, please try again.</p>";
        })
    }

    cancel.onclick = function() {

        document.getElementById("shadow").style.display = 'none';
        document.body.style.overflow = "auto";
        document.body.removeChild(document.getElementById("post_add_modal"));
    }

    function submitText(cube) {

        //Upload text data to database.

        var split = $("#file").prop("files")[0].name.split(".");
        var thumbPath = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + split[0] + "_thumb" + "." + split[1];
        var path = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + $("#file").prop("files")[0].name;
        var title = document.getElementById("post_title").value;
        var description = document.getElementById("post_desc").value;
        var size = document.getElementById("post_size").value;

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "INSERT INTO post(image_loc, title, description, collection, size, thumbnail_loc) VALUES($5, $1, $2, $4, $3, $6)",
                      vars: [title, description, size, colID, path, thumbPath],
                      type: "insert"})}
        }).done(function(res) {
            document.body.removeChild(document.getElementById("post_add_modal"));
            populate();
        }).catch(function(err) {
            document.getElementById("error").innerHTML = "Internal server error, please try again.";
        });
    }
}

function deletePost(id) {

    document.getElementById("shadow").style.display = 'block';
    document.body.style.overflow = "hidden";

    var split = id.split("dp");
    var postID = split[1];

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "SELECT title, image_loc, thumbnail_loc FROM post WHERE pid = $1",
                  vars: [postID],
                  type: "get"})}
    }).done(function(response) {

        var confirmModal = document.createElement("div");
        confirmModal.setAttribute("class", "modal");
        confirmModal.setAttribute("id", "confirm_delete_modal");

        confirmModal.innerHTML =    "<div id='error'></div>" +
                                    "<p class='modal_text'>Are you sure you want to delete " + response[0].title + "?</p>" +
                                    "<button type='button' class='submit' id='submit_post_delete'>Yes</button>" +
                                    "<button type='button' class='cancel' id='cancel_post_delete'>No</button>";

        document.body.appendChild(confirmModal);

        submit = document.getElementById("submit_post_delete");
        cancel = document.getElementById("cancel_post_delete");

        submit.onclick = function() {

            $.ajax({
                url: "delete",
                type: "POST",
                data: {data: JSON.stringify({fileName: response[0].image_loc, type: "main"})}
            }).done(function(res) {

                $.ajax({
                    url: "delete",
                    type: "POST",
                    data: {data: JSON.stringify({fileName: response[0].thumbnail_loc, type: "thumb"})}
                }).done(function(res) {

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

                        document.body.removeChild(document.getElementById("confirm_delete_modal"));
                        populate();

                    }).catch(function(err) {

                        document.getElementById("error").innerHTML = "Internal server error, please try again."

                    });

                }).catch(function(err) {

                    document.getElementById("error").innerHTML = "Internal server error, please try again."
                });
            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error, please try again."
            });
        }

        cancel.onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.style.overflow = "auto";
            document.body.removeChild(document.getElementById("confirm_delete_modal"));
        }
    });
}

function addCollection() {

    document.getElementById("shadow").style.display = "block";
    document.body.style.overflow = "hidden";

    var addModal = document.createElement("div");
    addModal.setAttribute("class", "modal");
    addModal.setAttribute("id", "col_add_modal");

    addModal.innerHTML =    "<div id='error'></div>" +
                            "<p class='modal_field_label text'>Title</p><input type='text' id='col_title' name='title'><br>" +
                            "<p class='modal_field_label text'>Description</p><textarea id='col_desc' name='description'></textarea><br>" +
                            "<button type='button' class='submit' id='submit_col'>Submit</button>" +
                            "<button type='button' class='cancel' id='cancel_col'>Cancel</button>";

    document.body.appendChild(addModal);

    submit = document.getElementById("submit_col");
    cancel = document.getElementById("cancel_col");

    submit.onclick = function() {

        var title = document.getElementById("col_title").value;
        var description = document.getElementById("col_desc").value;

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify({
                        query: "INSERT INTO collection(title, description, featured) VALUES($1, $2, false)",
                        vars: [title, description],
                        type: "insert"
                    })}
        }).done(function(res) {
            document.body.removeChild(document.getElementById("col_add_modal"));
            populate();
        }).catch(function(err) {
            document.getElementById("error").innerHTML = "Internal server error, please try again.";
        })
    }

    cancel.onclick = function() {

        document.getElementById("shadow").style.display = 'none';
        document.body.style.overflow = "auto";
        document.body.removeChild(document.getElementById("col_add_modal"));
    }
}

function editCollection(id) {

    document.getElementById("shadow").style.display = "block";
    document.body.style.overflow = "hidden";

    var split = id.split("ec");
    var colID = split[1];

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "SELECT * FROM collection WHERE cid = $1",
                  vars: [colID],
                  type: "get"})}
    }).done(function(response) {

        var editModal = document.createElement("div");
        editModal.setAttribute("class", "modal");
        editModal.setAttribute("id", "col_edit_modal");

        editModal.innerHTML =   "<div id='error'></div>" +
                                "<p class='modal_field_label text'>Title</p><input type='text' id='col_title' name='title' value='" + response[0].title + "'><br>" +
                                "<p class='modal_field_label text'>Description</p><textarea id='col_desc' name='description'>" + response[0].description + "</textarea><br>" +
                                "<button type='button' class='submit' id='submit_col'>Submit</button>" +
                                "<button type='button' class='cancel' id='cancel_col'>Cancel</button>";

        document.body.appendChild(editModal);

        submit = document.getElementById("submit_col");
        cancel = document.getElementById("cancel_col");

        submit.onclick = function() {

            var title = document.getElementById("col_title").value;
            var description = document.getElementById("col_desc").value;

            $.ajax({
                url: "DBRequest",
                type: "POST",
                async: false,
                data: { data:
                        JSON.stringify({
                            query: "UPDATE collection SET title = $1, description = $2 WHERE cid = $3",
                            vars: [title, description, response[0].cid],
                            type: "update"
                        })}
            }).done(function(res) {
                document.body.removeChild(document.getElementById("col_edit_modal"));
                populate();
            }).catch(function(err) {
                document.getElementById("error").innerHTML = "Internal server error, please try again.";
            })
        }

        cancel.onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.style.overflow = "auto";
            document.body.removeChild(document.getElementById("col_edit_modal"));
        }
    });
}

function deleteCollection(id) {

    document.getElementById("shadow").style.display = "block";
    document.body.style.overflow = "hidden";

    var split = id.split("dc");
    var colID = split[1];

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "SELECT title FROM collection WHERE cid = $1",
                  vars: [colID],
                  type: "get"})}
    }).done(function(response) {

        var confirmModal = document.createElement("div");
        confirmModal.setAttribute("class", "modal");
        confirmModal.setAttribute("id", "confirm_delete_modal");

        confirmModal.innerHTML =    "<div id='error'></div>" +
                                    "<p class='modal_text'>Are you sure you want to delete " + response[0].title + "? This will delete all of it's contents.</p>" +
                                    "<button type='button' class='submit' id='submit_col_delete'>Yes</button>" +
                                    "<button type='button' class='cancel' id='cancel_col_delete'>No</button>";

        document.body.appendChild(confirmModal);

        submit = document.getElementById("submit_col_delete");
        cancel = document.getElementById("cancel_col_delete");

        submit.onclick = function() {

            $.ajax({
                url: "DBRequest",
                type: "POST",
                async: false,
                data: { data:
                        JSON.stringify(
                        { query: "DELETE FROM post WHERE collection = $1",
                          vars: [colID],
                          type: "delete"})}
            }).done(function(res) {

                $.ajax({
                    url: "DBRequest",
                    type: "POST",
                    async: false,
                    data: { data:
                            JSON.stringify(
                            { query: "DELETE FROM collection WHERE cid = $1",
                              vars: [colID],
                              type: "delete"})}
                }).done(function(res) {

                    document.body.removeChild(document.getElementById("confirm_delete_modal"));
                    populate();

                }).catch(function(err) {

                    document.getElementById("error").innerHTML = "Internal server error, please try again.";

                });

            }).catch(function(err) {

                document.getElementById("error").innerHTML = "Internal server error, please try again."
            });
        }

        cancel.onclick = function() {

            document.getElementById("shadow").style.display = 'none';
            document.body.style.overflow = "auto";
            document.body.removeChild(document.getElementById("confirm_delete_modal"));
        }
    })
}

function feature(id) {

    var split = id.split("fb");
    var colID = split[1];

    $.ajax({
        url: "DBRequest",
        type: "POST",
        async: false,
        data: { data:
                JSON.stringify(
                { query: "UPDATE collection SET featured = false WHERE cid = (SELECT cid FROM collection WHERE featured = true)",
                  vars: [],
                  type: "update"})}
    }).done(function(response) {

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "UPDATE collection SET featured = true WHERE cid = $1",
                      vars: [colID],
                      type: "update"})}
        }).done(function(res) {

            populate();

        }).catch(function(err) {

            alert("Internal server error, please try again.");
        });
    }).catch(function(err) {

        alert("Internal server error, please try again.");
    });
}

function basicInfo(type) {

    document.getElementById("shadow").style.display = "block";
    document.body.style.overflow = "hidden";

    if (type === "About") {

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "SELECT about_img_loc, about FROM basic_info WHERE bid=0",
                      vars: [],
                      type: "get"})}
        }).done(function(info) {

            var aboutModal = document.createElement("div");
            aboutModal.setAttribute("class", "modal");
            aboutModal.setAttribute("id", "about_modal");

            aboutModal.innerHTML =  "<img class='thumbnail' src='" + info[0].about_img_loc + "'><br>" +
                                    "<div id='error'></div>" +
                                    "<p class='modal_thumb text'>Picture</p><input type='file' id='file' name='file'><br>" +
                                    "<p class='modal_field_label text'>Bio</p><textarea id='bio' name='bio'>" + info[0].about + "</textarea><br>" +
                                    "<button type='button' class='submit' id='submit_about'>Submit</button>" +
                                    "<button type='button' class='cancel' id='cancel_about'>Cancel</button>";

            document.body.appendChild(aboutModal);

            submit = document.getElementById("submit_about");
            cancel = document.getElementById("cancel_about");

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
                }

                else submitText();
            }

            cancel.onclick = function() {

                document.getElementById("shadow").style.display = 'none';
                document.body.style.overflow = "auto";
                document.body.removeChild(document.getElementById("about_modal"));
            }

            function submitText(cube) {

                if ($("#file").prop("files").length > 0) var path = "https://cloud-cube.s3.amazonaws.com/" + cube + "/public/" + $("#file").prop("files")[0].name;
                else var path = info[0].about_img_loc;
                var bio = document.getElementById("bio").value;

                $.ajax({
                    url: "DBRequest",
                    type: "POST",
                    async: false,
                    data: { data:
                            JSON.stringify(
                            { query: "UPDATE basic_info SET about_img_loc = $1, about = $2 WHERE bid = 0",
                              vars: [path, bio],
                              type: "update"})}
                }).done(function(res) {
                    document.body.removeChild(document.getElementById("about_modal"));
                    populate();
                }).catch(function(err) {
                    document.getElementById("error").innerHTML = "Internal server error, please try again.";
                });
            }
        });
    }
    else if (type === "Contact") {

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "SELECT contact FROM basic_info WHERE bid=0",
                      vars: [],
                      type: "get"})}
        }).done(function(info) {

            var contactModal = document.createElement("div");
            contactModal.setAttribute("class", "modal");
            contactModal.setAttribute("id", "contact_modal");

            contactModal.innerHTML =    "<div id='error'></div>" +
                                        "<p class='modal_field_label text'>Contact Info</p><textarea id='contact' name='contact'>" + info[0].contact + "</textarea><br>" +
                                        "<button type='button' class='submit' id='submit_contact'>Submit</button>" +
                                        "<button type='button' class='cancel' id='cancel_contact'>Cancel</button>";

            document.body.appendChild(contactModal);

            submit = document.getElementById("submit_contact");
            cancel = document.getElementById("cancel_contact");

            submit.onclick = function() {

                contact = document.getElementById("contact").value;

                $.ajax({
                    url: "DBRequest",
                    type: "POST",
                    async: false,
                    data: { data:
                            JSON.stringify(
                            { query: "UPDATE basic_info SET contact = $1 WHERE bid = 0",
                              vars: [contact],
                              type: "update"})}
                }).done(function(res) {
                    document.body.removeChild(document.getElementById("contact_modal"));
                    populate();
                }).catch(function(err) {
                    document.getElementById("error").innerHTML = "Internal server error, please try again.";
                });
            }

            cancel.onclick = function() {

                document.getElementById("shadow").style.display = 'none';
                document.body.style.overflow = "auto";
                document.body.removeChild(document.getElementById("contact_modal"));
            }
        });
    }
    else if (type === "Purchase") {

        $.ajax({
            url: "DBRequest",
            type: "POST",
            async: false,
            data: { data:
                    JSON.stringify(
                    { query: "SELECT purchase FROM basic_info WHERE bid=0",
                      vars: [],
                      type: "get"})}
        }).done(function(info) {

            var purchaseModal = document.createElement("div");
            purchaseModal.setAttribute("class", "modal");
            purchaseModal.setAttribute("id", "purchase_modal");

            purchaseModal.innerHTML =   "<div id='error'></div>" +
                                        "<p class='modal_field_label text'>Purchase Info</p><textarea id='purchase' name='purchase'>" + info[0].purchase + "</textarea><br>" +
                                        "<button type='button' class='submit' id='submit_purchase'>Submit</button>" +
                                        "<button type='button' class='cancel' id='cancel_purchase'>Cancel</button>";

            document.body.appendChild(purchaseModal);

            submit = document.getElementById("submit_purchase");
            cancel = document.getElementById("cancel_purchase");

            submit.onclick = function() {

                purchase = document.getElementById("purchase").value;

                $.ajax({
                    url: "DBRequest",
                    type: "POST",
                    async: false,
                    data: { data:
                            JSON.stringify(
                            { query: "UPDATE basic_info SET purchase = $1 WHERE bid = 0",
                              vars: [purchase],
                              type: "update"})}
                }).done(function(res) {
                    document.body.removeChild(document.getElementById("purchase_modal"));
                    populate();
                }).catch(function(err) {
                    document.getElementById("error").innerHTML = "Internal server error, please try again.";
                });
            }

            cancel.onclick = function() {

                document.getElementById("shadow").style.display = 'none';
                document.body.style.overflow = "auto";
                document.body.removeChild(document.getElementById("purchase_modal"));
            }
        });
    }
}
