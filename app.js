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
//  Check all config vars with command "heroku config -a <project>"
//  Add each variable to .env with command "heroku config:get <varname> -a <project> -s >> .env"
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

//Helper function for deleteing from the cube.
function deleteImage( path ) {

    return new Promise( function( resolve, reject ) {

        var pathData = path.split("/");

        const params = { Bucket: BUCKET,
                         Key: pathData[3] + "/" + pathData[4] + "/" + pathData[5] }

        s3.deleteObject( params, function( err, data ) {

            if (err) reject(err);
            else resolve(data);
        });
    });
}

//Configuring server

let app = express();
let port = process.env.PORT || 3000;

//Activate Helmet, which configures HTTP headers to prevent common security vulnerabilities.

app.use(helmet());

//Forcing HTTPS
app.use(secure);

app.use(bodyParser.json());
app.use(logger('tiny'));
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

//Creates helper function for pausing the program.
function sleep(milliseconds) {

    var start = new Date().getTime();

    do { var time = new Date().getTime(); } while (time - start <= milliseconds);
}

//Function for building a server-side model of the DB
var model = {};

function popInfo() {

    return new Promise((resolve, request) => {

        console.log("Promise Returned");

        db.one("SELECT * FROM basic_info WHERE bid = 0", []).then(function(info) {

            console.log("info returned");

            model["info"] = {
                aboutImage: info.about_img_loc,
                about: info.about,
                contact: info.contact,
                purchase: info.purchase,
                title: info.title,
                intro: info.intro,
                trueSizePrice: info.truesize_price,
                aspectRatioMult: info.aspect_ratio_mult
            }

        }).then(() => {

            //Start Server

            app.listen(port, function() {
                console.log("== Server listening on port " + port);
            });

            resolve();

        }).catch(err => { reject(err) });
    });
}

function popPosts() {

    return new Promise((resolve, reject) => {

        db.any("SELECT * FROM post", []).then(function(posts) {

            console.log("posts returned");

            model["posts"] = [];

            posts.forEach((post, i) => {

                model.posts[i] = {
                    id: post.pid,
                    image: post.image_loc,
                    title: post.title,
                    description: post.description,
                    index: post.index,
                    thumbnail: post.thumbnail,
                    originalSize: post.original_size
                };
            });

            resolve();

        }).catch(err => { reject(err); });
    });
}

function popCollections() {

    return new Promise((resolve, reject) => {

        db.any("SELECT * FROM collection", []).then(function(collections) {

            console.log("collections returned");

            model["collections"] = []

            collections.forEach((collection, i) => {

                model.collections[i] = {
                    id: collection.cid,
                    title: collection.title,
                    description: collection.description,
                    posts: []
                };

                db.any("SELECT * FROM post WHERE collection = $1 ORDER BY index", [collection.cid]).then(function(posts) {

                    posts.forEach((post, k) => {

                        model.collections[i].posts[k] = {
                            id: post.pid,
                            image: post.image_loc,
                            title: post.title,
                            description: post.description,
                            index: post.index,
                            thumbnail: post.thumbnail_loc,
                            originalSize: post.original_size
                        };
                    });

                    if (i === collections.length - 1) resolve();

                }).catch(err => { reject(err); });
            })

        }).catch(err => { reject(err); });

    });
}

function popPrintTypes() {

    return new Promise((resolve, reject) => {

        db.any("SELECT * FROM print_types ORDER BY mult", []).then(function(printTypes) {

            console.log("print types returned");

            model["printTypes"] = []

            printTypes.forEach((printType, i) => {

                model.printTypes[i] = { id: printType.ptid,
                                        name: printType.name,
                                        mult: printType.mult};
            });

            resolve();

        }).catch(err => { reject(err); });
    });
}

function popSizes() {

    return new Promise((resolve, reject) => {

        db.any("SELECT * FROM sizes ORDER BY width, height, price", []).then(function(sizes) {

            console.log("sizes returned");

            model["sizes"] = []

            sizes.forEach((size, i) => {

                model.sizes[i] = {  id: size.sid,
                                    width: size.width,
                                    height: size.height,
                                    price: size.price};
            });

            resolve();

        }).catch((err) => { reject(err); });
    });
}

popInfo().catch((err) => { console.log(err) });
popPosts().catch((err) => { console.log(err) });
popCollections().catch((err) => { console.log(err) });
popPrintTypes().catch((err) => { console.log(err) });
popSizes().catch((err) => { console.log(err) });

////////////////////////////////////////////////////////////////////////////////
//Web Pages/////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

//Renders client home page
app.get('/', function(req, res) {

    console.log(model.info);
    res.status(200).render("home", { collections: model.collections, info: model.info });

});

app.get("/admin/pricing/:modal?/:id?", function(req, res) {

    if (req.session.loggedin) {

        if (typeof req.params.modal === "undefined")
            res.status(200).render("pricing", { sizes: model.sizes, printTypes: model.printTypes });

        else if (req.params.modal === "trueSize")
            res.status(200).render("adminModals/trueSize", {
                data: {trueSizePrice: model.info.trueSizePrice, aspectRatioMult: model.info.aspectRatioMult},
                sizes: model.sizes,
                printTypes: model.printTypes
            });

        else if (req.params.modal === "addSize")
            res.status(200).render("adminModals/addSize", { sizes: model.sizes, printTypes: model.printTypes });

        else if (req.params.modal === "editSize" && typeof req.params.id !== "undefined") {

            var id = parseInt(req.params.id);
            var size = model.sizes.find( size => size.id === id );

            if (typeof size === "undefined") res.status(404).render("404", {message: "Index not found."})
            else res.status(200).render("adminModals/editSize", { size: size, sizes: model.sizes, printTypes: model.printTypes });
        }

        else if (req.params.modal === "addType")
            res.status(200).render("adminModals/addType", { sizes: model.sizes, printTypes: model.printTypes });

        else if (req.params.modal === "editType" && typeof req.params.id !== "undefined") {

            var id = parseInt(req.params.id);
            var type = model.printTypes.find( type => type.id === id );

            if (typeof type === "undefined") res.status(404).render("404", {message: "Index not found."})
            else res.status(200).render("adminModals/editType", { printType: type, sizes: model.sizes, printTypes: model.printTypes });
        }
    }
    else res.render("admin", {authorized: false});
});

//Renders admin site
app.get('/admin/:modal?/:id?', function(req, res) {

    if (req.session.loggedin) {

        if (typeof req.params.modal === "undefined")
            res.status(200).render("admin", { authorized: true, data: model.collections });

        else if (req.params.modal === "addPost")
            res.status(200).render("adminModals/addPost", { authorized: true, data: model.collections });

        else if (req.params.modal === "editPost" && typeof req.params.id !== "undefined") {

            var id = parseInt(req.params.id);
            var post = model.posts.find( post => post.id === id );

            if (typeof post === "undefined") res.status(404).render("404", {message: "Index not found."});
            else res.status(200).render("adminModals/editPost", { authorized: true, data: model.collections, post: post });
        }

        else if (req.params.modal === "deletePost" && typeof req.params.id !== "undefined") {

            var id = parseInt(req.params.id);
            var post = model.posts.find( post => post.id === id );

            if (typeof post === "undefined") res.status(404).render("404", {message: "Index not found."});
            else res.status(200).render("adminModals/deletePost", { authorized: true, data: model.collections, post: post });
        }

        else if (req.params.modal === "addCollection")
            res.status(200).render("adminModals/addCollection", { authorized: true, data: model.collections });

        else if (req.params.modal === "editCollection" && typeof req.params.id !== "undefined") {

            var id = parseInt(req.params.id);
            var collection = model.collections.find( collection => collection.id === id );

            if (typeof collection === "undefined") res.status(404).render("404", {message: "Index not found."});
            else res.status(200).render("adminModals/editCollection", { authorized: true, data: model.collections, collection: collection });
        }

        else if (req.params.modal === "deleteCollection" && typeof req.params.id !== "undefined") {

            var id = parseInt(req.params.id);
            var collection = model.collections.find( collection => collection.id === id );

            if (typeof collection === "undefined") res.status(404).render("404", {message: "Index not found."});
            else res.status(200).render("adminModals/deleteCollection", { authorized: true, data: model.collections, collection: collection });
        }

        else if (req.params.modal === "info"  && typeof req.params.id !== "undefined") {

            if (req.params.id === "about")
                res.status(200).render("adminModals/info", {type: "about", info: model.info, authorized: true, data: model.collections});

            else if (req.params.id === "contact")
                res.status(200).render("adminModals/info", {type: "contact", info: model.info, authorized: true, data: model.collections});

            else if (req.params.id === "purchase")
                res.status(200).render("adminModals/info", {type: "purchase", info: model.info, authorized: true, data: model.collections});

            else if (req.params.id === "title")
                res.status(200).render("adminModals/info", {type: "title", info: model.info, authorized: true, data: model.collections});
        }

        else res.status(404).render("admin", { authorized: true, data: model.collections });
    }
    else res.render("admin", {authorized: false});
});

//Renders client galleries and post modals.
app.get('/:gallery/:post?', function(req, res) {

    if (typeof req.params.post === "undefined") {

        var name = req.params.gallery;
        var collection = model.collections.find( collection => collection.title === name );

        if (typeof collection === "undefined") res.status(404).render("404", {message: "Gallery not found"});
        else res.status(200).render("gallery", {collection: collection});
    }
    else {

        var collectionTitle = req.params.gallery;
        var postTitle = req.params.post;

        var collection = model.collections.find( collection => collection.title === collectionTitle );

        if (typeof collection === "undefined") res.status(404).render("404", {message: "Gallery not found"});
        else {

            var post;
            var prev = null;
            var next = null;

            for (var i = 0; i < collection.posts.length; i++) {

                if (collection.posts[i].title === postTitle) {

                    post = collection.posts[i];
                    if (i !== 0) prev = collection.posts[i - 1];
                    if (i !== collection.posts.length - 1) next = collection.posts[i + 1];
                    break;
                }
            }

            if (typeof post === "undefined") res.status(404).render("404", {message: "Post not found"});
            else res.status(200).render("post", {post: post, prev: prev, next: next, collection: collection});
        }
    }
});

//Renders 404 page
app.get("*", function(req, res) {
    res.render("404", {message: "This page does not exist"});
});

//////////////////////////////////////////////////////////////////////////////
//DATABASE REQUESTS///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

//Helper functions for generic http responses to POST requests
function success( res ) {

    res.status(200).send({message: "Success"});
}

function error( err, res ) {

    console.log(err);
    res.status(400).send({message: "Failure: Internal server error"});
}

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

        console.log(err);
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
            error(err, res);
            return;
        }

        bcrypt.hash(password, salt, function(err, hash) {

            if (err) {
                error(err, res);
                return;
            }

            db.none('INSERT INTO "user"("email", "password", "admin_status")' +
                    'VALUES($1, $2, false)', [email, hash])
            .then(function(data) { success(res); })
            .catch(function(data) { error(err, res); })
        });

    });
});*/

//Submits DB query to insert a new collection.
app.post("/addCollection", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let title = req.body.title;
    let description = req.body.description;

    db.none("INSERT INTO collection(title, description) VALUES($1, $2)", [title, description])
    .then(function(result) {
        popCollections().then(_ => { success(res); }).catch(err => { error(err, res) });
    }).catch(function(err) { error(err, res) });
});

//Submits DB query to edit a collections information.
app.post("/editCollection", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let cid = req.body.cid;
    let title = req.body.title;
    let description = req.body.description;

    db.none("UPDATE collection SET title = $1, description = $2 WHERE cid = $3", [title, description, cid])
    .then(function(result) {
        popCollections().then(_ => { success(res); }).catch(err => { error(err, res) });
    }).catch(function(err) { error(err, res) });
});

//Deletes a collection.
//Submits AWS requests to delete all images referenced by posts in the collection,
//then submits DB queries to delete all of the posts and the collection.
app.post("/deleteCollection", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let cid = req.body.cid;

    db.any("SELECT image_loc, thumbnail_loc FROM post WHERE collection = $1", [cid])
    .then(function(posts) {

        if (posts.length === 0) {

            db.none("DELETE FROM collection WHERE cid = $1", [cid])
            .then(function(result) {
                popCollections().then(_ => { success(res); }).catch(err => { error(err); });
            }).catch(function(err) { error(err, res); });
        }
        else {

            posts.forEach(function(post, i) {

                deleteImage(post.image_loc)
                .then(function(result) {

                    deleteImage(post.thumbnail_loc)
                    .then(function(result) {

                        db.none("DELETE FROM post WHERE pid = $1", [post.pid])
                        .then(function(result) {

                            if (i === posts.length - 1) {

                                db.none("DELETE FROM post WHERE collection = $1", [cid])
                                .then(function(result) {

                                    db.none("DELETE FROM collection WHERE cid = $1", [cid])
                                    .then(function(result) {
                                        popCollections().then(_ => { success(res); }).catch(err => { error(err, res) });
                                    }).catch(function(err) { error(err, res); });

                                }).catch(function(err) { error(err, res); });
                            }

                        }).catch(function(err) { error(err, res); });

                    }).catch(function(err) { error(err, res); })

                }).catch(function(err) { error(err, res); })
            });
        }
    });
});

//Submits DB query to add a new post.
app.post("/addPost", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let title = req.body.title;
    let description = req.body.description;
    let collection = req.body.collection;
    let path = req.body.path;
    let thumbPath = req.body.thumbPath;
    let originalSize = req.body.originalSize;

    db.none("INSERT INTO post(title, description, collection, image_loc, thumbnail_loc, original_size) VALUES($1, $2, $3, $4, $5, $6)",
            [title, description, collection, path, thumbPath, originalSize])
    .then(function(result) {
        popPosts().catch(err => { console.log(err); });
        popCollections().then(_ => { success(res); }).catch(err => { error(err, res) });
    }).catch(function(err) { error(err, res); });
});

//Submits AWS requests to delete image referenced by the post, the submits DB
//request to delete the post.
app.post("/deletePost", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let pid = req.body.pid;

    db.one("SELECT image_loc, thumbnail_loc FROM post WHERE pid = $1", [pid])
    .then(function(path) {

        deleteImage(path.image_loc)
        .then(function(result) {

            deleteImage(path.thumbnail_loc)
            .then(function(result) {

                db.none("DELETE FROM post WHERE pid = $1", [pid])
                .then(function(result) {
                    popPosts().catch(err => { console.log(err); });
                    popCollections().then(_ => { success(res); }).catch(err => { error(err, res); });
                }).catch(function(err) { error(err, res); });

            }).catch(function(err) { error(err, res); });

        }).catch(function(err) { error(err, res); });

    }).catch(function(err) { error(err, res); });
});

//Submits DB query to edit a post.
//If the image reference was changed, submits AWS requests to delete the old ones.
app.post("/editPost", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let title = req.body.title;
    let description = req.body.description;
    let pid = req.body.pid;

    if (typeof req.body.path === "undefined") {

        db.none("UPDATE post SET title = $1, description = $2 WHERE pid = $3",
        [title, description, pid])
        .then(function(result) {
            popPosts().catch(err => { console.log(err); });
            popCollections().then(_ => { success(res); }).catch(err => { error(err, res); });
        }).catch(function(err) { error(err, res); });
    }
    else {

        let newPath = req.body.path;
        let newThumbPath = req.body.thumbPath;
        let originalSize = req.body.originalSize;

        db.one("SELECT image_loc, thumbnail_loc FROM post WHERE pid = $1", [pid])
        .then(function(path) {

            if (path.image_loc !== newPath) {

                deleteImage(path.image_loc)
                .then(function(result) {

                    deleteImage(path.thumbnail_loc)
                    .then(function(result) {

                        db.none("UPDATE post SET title = $1, description = $2, image_loc = $3, thumbnail_loc = $4, original_size = $5 WHERE pid = $6",
                        [title, description, newPath, newThumbPath, originalSize, pid])
                        .then(function(result) {
                            popPosts().catch(err => { console.log(err); });
                            popCollections().then(_ => { success(res); }).catch(err => { error(err, res); });
                        }).catch(function(err) { error(err, res); });

                    }).catch(function(err) { error(err, res); });

                }).catch(function(err) { error(err, res); });
            }

            else {

                db.none("UPDATE post SET title = $1, description = $2, image_loc = $3, thumbnail_loc = $4, original_size = $5 WHERE pid = $6",
                [title, description, newPath, newThumbPath, originalSize, pid])
                .then(function(result) {
                    popPosts().catch(err => { console.log(err); });
                    popCollections().then(_ => { success(res); }).catch(err => { error(err, res); });
                }).catch(function(err) { error(err, res); });
            }

        }).catch(function(err) { error(err, res); });
    }
});

app.post("/updateInfo", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let type = req.body.type;

    if (type === "about") {

        let bio = req.body.bio;

        if (typeof req.body.path !== "undefined")  {

            let path = req.body.path;

            db.none("UPDATE basic_info SET about_img_loc = $1, about = $2", [path, bio])
            .then(function(result) {
                popInfo().then(_ => { success(res); }).catch(err => { error(err, res); });
            }).catch(function(err) { error(err, res); });
        }
        else {

            db.none("UPDATE basic_info SET about = $1", [bio])
            .then(function(result) {
                popInfo().then(_ => { success(res); }).catch(err => { error(err, res); });
            }).catch(function(err) { error(err, res); });
        }
    }
    else if (type === "contact" || type === "purchase") {

        let info = req.body.info;

        db.none("UPDATE basic_info SET " + type + " = $1", [info])
        .then(function(result) {
            popInfo().then(_ => { success(res); }).catch(err => { error(err, res); });
        }).catch(function(err) { error(err, res); });
    }
    else if (type === "title") {

        let title = req.body.title;
        let intro = req.body.intro;

        db.none("UPDATE basic_info SET title = $1, intro = $2", [title, intro])
        .then(function(result) {
            popInfo().then(_ => { success(res); }).catch(err => { error(err, res); });
        }).catch(function(err) { error(err, res); });
    }
    else error("Unknown information type", res);
});

app.post("/addSize", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let width = req.body.width;
    let height = req.body.height;
    let price = req.body.price;

    db.none("INSERT INTO sizes(width, price, height) VALUES($1, $2, $3)", [width, price, height])
    .then(function(result) {
        popSizes().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/editSize", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let width = req.body.width;
    let height = req.body.height;
    let price = req.body.price;
    let sid = req.body.sid;

    db.none("UPDATE sizes SET width = $1, price = $2, height = $3 WHERE sid = $4", [width, price, height, sid])
    .then(function(result) {
        popSizes().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/deleteSize", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let sid = req.body.sid;

    db.none("DELETE FROM sizes WHERE sid = $1", [sid])
    .then(function(result) {
        popSizes().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/addType", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let name = req.body.name;
    let mult = req.body.mult;

    db.none("INSERT INTO print_types(name, mult) VALUES($1, $2)", [name, mult])
    .then(function(result) {
        popPrintTypes().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/editType", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let name = req.body.name;
    let mult = req.body.mult;
    let ptid = req.body.ptid;

    db.none("UPDATE print_types SET name = $1, mult = $2 WHERE ptid = $3", [name, mult, ptid])
    .then(function(result) {
        popPrintTypes().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/deleteType", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let ptid = req.body.ptid;

    db.none("DELETE FROM print_types WHERE ptid = $1", [ptid])
    .then(function(result) {
        popPrintTypes().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/trueSize", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let price = req.body.price;
    let mult = req.body.mult;

    db.none("UPDATE basic_info SET truesize_price = $1, aspect_ratio_mult = $2 WHERE bid = 0", [price, mult])
    .then(function(result) {
        popInfo().then(_ => { success(res); }).catch(err => { error(err, res); });
    }).catch(function(err) { error(err, res); });
});

app.post("/reorder", function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let post = req.body.pid;
    let collection = req.body.cid;
    let index = req.body.newIndex;

    db.none("UPDATE post SET index = $1 WHERE pid = $1", [index, post])
    .then(function(result) {

        db.none("UPDATE post SET index = index + 1 WHERE collection = $1 AND index >= $2 AND pid != $3", [collection, index, post])
        .then(function(result) {
            popPosts();
            popCollections().then(_ => { success(res); }).catch(err => { error(err, res); });
        }).catch(function(err) { error(err, res); });
    })
    .catch(function(err) { error(err, res); });
});

//Handles file uploads
app.post('/upload', upload.single("file"), function(req, res) {

    if (req.session.loggedin === false) {

        res.status(400).send({message: "Unauthorized for database access."});
        return;
    }

    let fileType = path.extname(req.file.originalname).toLowerCase();
    if (fileType !== ".jpeg" && fileType !== ".jpg" && fileType !== ".png") {

        res.status(403).send({message: "Only jpgs and pngs allowed."});
        return;
    }

    const content = fs.readFileSync(req.file.path);

    const params = {
        Bucket: BUCKET,
        Key: CUBE + "/public/" + req.file.originalname,
        Body: content
    }

    s3.upload(params, function(err, data) {
        if (err) error(err, res);
        else res.status(200).send({message: "Success", cube: CUBE});
    });
});
