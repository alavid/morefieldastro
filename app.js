let http = require("http");
let secure = require("express-force-https");
let fs = require("fs");
let path = require("path");
let express = require("express");
let promise = require("bluebird");
let bodyParser = require("body-parser");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
let bcrypt = require("bcryptjs");
let multer = require("multer");
let AWS = require("aws-sdk");
let pgp = require("pg-promise")({promiseLib: promise});
let sanitize = require("sanitize");
let pug = require("pug");
let session = require("express-session");
let MemoryStore = require("memorystore")(session);
let helmet = require("helmet");

//Establish database connection
//NOTE: IF RUNNING LOCALLY, process.env will only work if you copy the heroku config vars to a .env file.
//  Check all config vars with command "heroku config -a morefield-astro"
//  Add each variable to .env with command "heroku config:get <varname> -a morefield-astro -s >> .env"
//  Database credentials are rotated occasionally, so if the connection is failing make sure the .env still contains the right var.

var conString = process.env.DATABASE_URL;

var conData = conString.split(/\/|@|:/);

const cn = {
    host: conData[5],
    port: conData[6],
    database: conData[7],
    user: conData[3],
    password: conData[4],
    ssl: true
};

let db = pgp(cn);

//Configuring S3 cube

var url = process.env.CLOUDCUBE_URL;

var urlData = url.split(/\/|\./);

let ID = process.env.CLOUDCUBE_ACCESS_KEY_ID;
let SECRET = process.env.CLOUDCUBE_SECRET_ACCESS_KEY;
let BUCKET = urlData[2];
let CUBE = urlData[6]

const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET
});

//Configuring server

let app = express();
let port = process.env.PORT || 3000;

//Activate Helmet, which configures HTTP headers to prevent common security vulnerabilities.

app.use(helmet());

//Forcing HTTPS
app.use(secure);

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(__dirname + 'Assets'));
app.use(express.static(path.join(__dirname, 'Assets')));

//Configuring Pug as the view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/Views"));

//Configuring sessions
app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: "secret",
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//Establishing temp directory for image uploads
const upload = multer({ dest: "uploads/" });

////////////////////////////////////////////////////////////////////////////////
//Web Pages/////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

//Renders client home page
app.get('/', function(req, res) {

    db.one("SELECT * FROM basic_info", []).then(function(info) {

        db.any(`SELECT collection.cid, collection.title, collection.description, post.image_loc
                FROM post, collection
                WHERE collection.cid = post.collection AND post.index = (
                    SELECT MIN(post.index)
                    FROM post, collection
                    WHERE post.collection = collection.cid
                )`, []).then(function(collections) {

                    res.render("home", {collections: collections, info: info});

                }).catch(function(err) {

                    console.log(JSON.stringify(err));
                    res.status(400).send({message: "Failure: Internal server error"});
                });
    }).catch(function(err) {

        console.log(JSON.stringify(err));
        res.status(400).send({message: "Failure: Internal server error"});
    });
});

//Renders admin site
app.get('/admin/:modal?/:id?', function(req, res) {

    if (req.session.loggedin) {

        db.any("SELECT cid, title, description FROM collection ORDER BY cid", []).then(function(collections) {

            db.any("SELECT pid, title, thumbnail_loc, collection FROM post ORDER BY index", []).then(function(posts) {

                var data = [];

                collections.forEach((collection) => {

                    var collPosts = [];

                    posts.forEach((post) => {

                        if (post.collection === collection.cid) collPosts.push(post);
                    });

                    data.push({collection: collection,  posts: collPosts});
                });

                if (typeof req.params.modal === "undefined")
                    res.render("admin", {authorized: true, data: data});
                else if (req.params.modal === "addPost")
                    res.render("addPost", {authorzied: true, data: data});
                else if (req.params.modal === "editPost" || req.params.modal === "deletePost") {

                    db.one("SELECT pid, title, description, size, image_loc FROM post WHERE pid = $1", [req.params.id])
                    .then(function(post) {

                        if (req.params.modal === "editPost") res.render("editPost", {authorized: true, data: data, post: post});
                        else res.render("deletePost", {authorized: true, data: data, post: post});

                    })
                }
                else if (req.params.modal === "addCollection")
                    res.render("addCollection", {authorized: true, data: data});
                else if (req.params.modal === "editCollection" || req.params.modal === "deleteCollection") {

                    db.one("SELECT cid, title, description FROM collection WHERE cid = $1", [req.params.id])
                    .then(function(col) {

                        if (req.params.modal === "editCollection") res.render("editCollection", {authorized: true, data: data, col: col});
                        else res.render("deleteCollection", {authorized: true, data: data, col: col});

                    }).catch(function(err) {

                            console.log(err);
                            res.status(400).send({message: "Internal server error."});
                    });
                }
                else res.render("admin", {authorized: true, data: data});
            })
        })
    }
    else {

        res.render("admin", {authorized: false});
    }
});

//Renders client galleries and post modals.
app.get('/:gallery/:post?', function(req, res) {

    if (typeof req.params.post === "undefined") {

        var name = req.params.gallery;

        db.one("SELECT cid, title, description FROM collection WHERE title = $1", [name] ).then(function(collection) {

            db.any("SELECT pid, title, thumbnail_loc FROM post WHERE collection = $1 ORDER BY index", [collection.cid]).then(function(posts) {

                res.render("gallery", {title: collection.title, description: collection.description, posts: posts});

            }).catch(function(err) {

                console.log(JSON.stringify(err));
                res.status(404).render("404", {message: "This collection does not exist."});
            });
        }).catch(function(err) {

            console.log(JSON.stringify(err));
            res.status(404).render("404", {message: "This collection does not exist."});
        });
    }
    else {
        var galleryName = req.params.gallery;
        var postName = req.params.post;

        db.one("SELECT cid, description FROM collection WHERE title = $1", [galleryName]).then(function(collection) {

            db.any("SELECT * FROM post WHERE collection = $1 ORDER BY index", [collection.cid]).then(function(posts) {

                var cur;
                var prev = null;
                var next = null;

                for (var i = 0; i < posts.length; i++) {

                    if (posts[i].title == postName) {

                        cur = posts[i];

                        if (i > 0 && i < (posts.length-1)) {

                            prev = posts[i-1];
                            next = posts[i+1];
                        }
                        else if (i > 0) prev = posts[i-1];
                        else if (i < (posts.length - 1)) next = posts[i + 1];

                        break;
                    }
                    else if (i === posts.length - 1) {

                        res.status(404).render("404", {message: "This image does not exist."});
                    }
                }

                res.render("post", {prev: prev, cur: cur, next: next, gallery: galleryName, desc: collection.description, posts: posts});

            }).catch(function(err) {

                console.log(JSON.stringify(err));
                res.status(404).render("404", {message: "This collection does not exist."});
            });
        }).catch(function(err) {

            console.log(JSON.stringify(err));
            res.status(404).render("404", {message: "This collection does not exist."});
        });
    }
});

//Renders 404 page
app.get("*", function(req, res) {
    res.render("404", {message: "This page does not exist"});
});

//////////////////////////////////////////////////////////////////////////////
//DATABASE REQUESTS///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

//Checks submitted email and password with database entries and either allows
//or disallows access.
app.post('/logIn', function(req, res) {

    var email = req.body.email;
    var password = req.body.password;

    db.one('SELECT * FROM "user" WHERE "email"=$1', [email])
    .then(function(data) {

        bcrypt.compare(password, data.password, function(err, result) {

            if (err) {

                res.status(400).send({message: "Failure: Internal server error", authorize: false});
                return;
            }

            if (result) {

                if (data.admin_status) {

                    req.session.loggedin = true;
                    req.session.email = email;
                    var response = {message: "Success", authorized: true};
                }
                else var response = {message: "Failure: Amin access not authorized", authorize: true};
            }
            else var response = {message: "Failure: Incorrect password", authorize: false};

            res.status(200).send(response);
        });

    }).catch(function(err) {

        console.log(JSON.stringify(err));
        res.status(200).send({message: "Failure: account not found", authorize: false});
    });
});

//Inserts submitted login info to database and handles password hashing.
//Currently not accepted, so commented out.
/*app.post('/signUp', function(req, res) {

    var email = req.body.email;
    var password = req.body.password;

    bcrypt.genSalt(10, function(err, salt) {

        if (err) {
            res.status(400).send({message: "Failure: Internal server error", authorize: false});
            return;
        }

        bcrypt.hash(password, salt, function(err, hash) {

            if (err) {
                res.status(400).send({message: "Failure: Internal server error"});
                return;
            }

            db.none('INSERT INTO "user"("email", "password", "admin_status")' +
                    'VALUES($1, $2, false)', [email, hash])
            .then(function(data) {

                res.status(200).send({message: "Success"});

            }).catch(function(data) {

                res.status(400).send({message: "Failure: Internal server error"});
            })
        });

    });
});*/

//Submits DB query to insert a new collection.
app.post("/addCollection", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let title = req.body.title;
    let description = req.body.description;

    db.none("INSERT INTO collection(title, description) VALUES($1, $2)", [title, description])
    .then(function(result) { res.status(200).send({message: "Success"}); })
    .catch(function(err) {

        console.log(err);
        res.status(400).send({message: "Failure: Internal server error"});

    });
});

//Submits DB query to edit a collections information.
app.post("/editCollection", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let cid = req.body.cid;
    let title = req.body.title;
    let description = req.body.description;

    db.none("UPDATE collection SET title = $1, description = $2 WHERE cid = $3", [title, description, cid])
    .then(function(result) { res.status(200).send({message: "Success"}); })
    .catch(function(err) {

        console.log(err);
        res.status(400).send({message: "Failure: Internal server error"});

    });
});

//Deletes a collection.
//Submits AWS requests to delete all images referenced by posts in the collection,
//then submits DB queries to delete all of the posts and the collection.
app.post("/deleteCollection", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let cid = req.body.cid;

    db.any("SELECT image_loc, thumbnail_loc FROM post WHERE collection = $1", [cid])
    .then(function(posts) {

        posts.forEach(function(post) {

            var pathData = post.image_loc.split("/");

            const params = {
                Bucket: BUCKET,
                Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5],
            }

            s3.deleteObject(params, function(err, data) {
                if (err) {
                    db.none("DELETE FROM post WHERE pid = $1", [pid])
                    .then(function(result) {

                        var response = {message: "Success"};
                        res.status(200).send(response);

                    }).catch(function(err) {

                        console.log(err);
                        res.status(400).send({message: "Failure: Internal server error"});
                    });
                }
                else {

                    pathData = post.thumbnail_loc.split("/");

                    const params = {
                        Bucket: BUCKET,
                        Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5],
                    }

                    s3.deleteObject(params, function(err, data) {
                        if (err) { console.log(err); }
                    });
                }
            });
        });

        db.none("DELETE FROM post WHERE collection = $1", [cid])
        .then(function(result) {

            db.none("DELETE FROM collection WHERE cid = $1", [cid])
            .then(function(result) { res.status(200).send({message: "Success"}); })
            .catch(function(err) {

                console.log(err);
                res.status(400).send({message: "Failure: Internal server error"});

            });
        }).catch(function(err) {

            console.log(err);
            res.status(400).send({message: "Failure: Internal server error"});
        });
    });
});

//Submits DB query to add a new post.
app.post("/addPost", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let title = req.body.title;
    let description = req.body.description;
    let size = req.body.size;
    let collection = req.body.collection;
    let path = req.body.path;
    let thumbPath = req.body.thumbPath;
    let originalSize = req.body.originalSize;

    db.none("INSERT INTO post(title, description, size, collection, image_loc, thumbnail_loc, original_size) VALUES($1, $2, $3, $4, $5, $6, $7)",
            [title, description, size, collection, path, thumbPath, originalSize])
    .then(function(result) { res.status(200).send({message: "Success"}); })
    .catch(function(err) {

        console.log(err);
        res.status(400).send({message: "Failure: Internal server error"});

    });
});

//Submits AWS requests to delete image referenced by the post, the submits DB
//request to delete the post.
app.post("/deletePost", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let pid = req.body.pid;

    db.one("SELECT image_loc, thumbnail_loc FROM post WHERE pid = $1", [pid])
    .then(function(path) {

        var pathData = path.image_loc.split("/");

        const params = {
            Bucket: BUCKET,
            Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5],
        }

        s3.deleteObject(params, function(err, data) {
            if (err) {
                db.none("DELETE FROM post WHERE pid = $1", [pid])
                .then(function(result) {

                    var response = {message: "Success"};
                    res.status(200).send(response);

                }).catch(function(err) {

                    console.log(err);
                    res.status(400).send({message: "Failure: Internal server error"});
                });
            }
            else {

                pathData = path.thumbnail_loc.split("/");

                const params = {
                    Bucket: BUCKET,
                    Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5],
                }

                s3.deleteObject(params, function(err, data) {
                    if (err) {
                        console.log(err);
                        res.status(400).send({message: "Failure: Internal server error"});
                    }
                    else {

                        db.none("DELETE FROM post WHERE pid = $1", [pid])
                        .then(function(result) {

                            var response = {message: "Success"};
                            res.status(200).send(response);

                        }).catch(function(err) {

                            console.log(err);
                            res.status(400).send({message: "Failure: Internal server error"});
                        });
                    }
                });
            }
        });

    }).catch(function(err) {

        console.log(err);
        res.status(400).send({message: "Failure: Internal server error"});

    });


});

//Submits DB query to edit a post.
//If the image reference was changed, submits AWS requests to delete the old ones.
app.post("/editPost", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let title = req.body.title;
    let description = req.body.description;
    let size = req.body.size;
    let pid = req.body.pid;

    if (typeof req.body.path === "undefined") {

        db.none("UPDATE post SET title = $1, description = $2, size = $3 WHERE pid = $4",
        [title, description, size, pid])
        .then(function(result) {

            var response = {message: "Success"};
            res.status(200).send(response);

        }).catch(function(err) {

            console.log(err);
            res.status(400).send({message: "Failure: Internal server error"});
        });
    }
    else {

        let newPath = req.body.path;
        let newThumbPath = req.body.thumbPath;
        let originalSize = req.body.oSize;

        db.one("SELECT image_loc, thumbnail_loc FROM post WHERE pid = $1", [pid])
        .then(function(path) {

            var pathData = path.image_loc.split("/");

            const params = {
                Bucket: BUCKET,
                Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5],
            }

            s3.deleteObject(params, function(err, data) {
                if (err) {
                    db.none("DELETE FROM post WHERE pid = $1", [pid])
                    .then(function(result) {

                        var response = {message: "Success"};
                        res.status(200).send(response);

                    }).catch(function(err) {

                        console.log(err);
                        res.status(400).send({message: "Failure: Internal server error"});
                    });
                }
                else {

                    pathData = path.thumbnail_loc.split("/");

                    const params = {
                        Bucket: BUCKET,
                        Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5],
                    }

                    s3.deleteObject(params, function(err, data) {
                        if (err) {
                            console.log(err);
                            res.status(400).send({message: "Failure: Internal server error"});
                        }
                        else {

                            db.none("UPDATE post SET title = $1, description = $2, size = $3, image_loc = $4, thumbnail_loc = $5, original_size = $6 WHERE pid = $7",
                            [title, description, size, newPath, newThumbPath, originalSize, pid])
                            .then(function(result) {

                                var response = {message: "Success"};
                                res.status(200).send(response);

                            }).catch(function(err) {

                                console.log(err);
                                res.status(400).send({message: "Failure: Internal server error"});
                            });
                        }
                    });
                }
            });

        }).catch(function(err) {

            console.log(err);
            res.status(400).send({message: "Failure: Internal server error"});
        });
    }
});

app.post("/reorder", function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let post = req.body.pid;
    let collection = req.body.cid;
    let index = req.body.newIndex;

    db.none("UPDATE post SET index = $1 WHERE pid = $2", [index, post])
    .then(function(result) {

        db.none("UPDATE post SET index = index + 1 WHERE collection = $1 AND index >= $2 AND pid != $3", [collection, index, post])
        .then(function(result) { res.status(200).send({message: "Success"}); })
        .catch(function(err) {

            console.log(err);
            res.status(400).send({message: "Failure: Internal server error"});
        });
    })
    .catch(function(err) {

        console.log(err);
        res.status(400).send({message: "Failure: Internal server error"});
    });
});

//Handles file uploads
app.post('/upload', upload.single("file"), function(req, res) {

    if (req.session.loggedin === false) res.status(400).send({message: "Unauthorized for database access."});

    let fileType = path.extname(req.file.originalname).toLowerCase();
    if (fileType !== ".jpg" && fileType !== ".png") res.status(403).send({message: "Only jpgs and pngs allowed."});

    const content = fs.readFileSync(req.file.path);

    const params = {
        Bucket: BUCKET,
        Key: CUBE + "/public/" + req.file.originalname,
        Body: content
    }

    s3.upload(params, function(err, data) {
        if (err) {
            console.log(err);
            res.status(400).send({message: "Failure: Internal server error"});
        }
        else {
            var response = {message: "Success", cube: CUBE};
            res.status(200).send(response);
        }
    });
})

//Start Server

app.listen(port, function() {
    console.log("== Server listening on port " + port);
});
