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

app.use(secure);

app.set("view engine", "pug");

const upload = multer({ dest: "uploads/" });

//Web Pages

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

app.get('/:gallery/:post?', function(req, res) {

    if (typeof req.params.post === "undefined") {

        var name = req.params.gallery;

        db.one("SELECT cid, title, description FROM collection WHERE title = $1", [name] ).then(function(collection) {

            db.any("SELECT pid, title, thumbnail_loc FROM post WHERE collection = $1", [collection.cid]).then(function(posts) {

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

app.get('/admin', function(req, res) {
    res.sendFile(path.join(__dirname, '/admin.html'));
});

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

                if (data.admin_status) var response = {message: "Success", authorize: true};
                else var response = {message: "Success", authorize: false};
            }
            else var response = {message: "Failure: Incorrect password", authorize: false};

            res.status(200).send(response);
        });

    }).catch(function(err) {

        console.log(JSON.stringify(err));
        res.status(400).send({message: "Failure: account not found", authorize: "No"});
    });
});

//Inserts submitted login info to database and handles password hashing.
app.post('/signUp', function(req, res) {

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
});

//Returns all content for intitally rendering the page.
app.post('/getEntries', function(req, res) {

    db.any( 'SELECT * FROM "collection" ORDER BY cid' )
    .then(function(collections) {

        db.any( 'SELECT * FROM "post" ORDER BY index ASC' )
        .then(function(posts) {

            var response = {collections: collections, posts: posts};
            res.status(200).send(response);

        }).catch(function(err) {

            res.status(400).send({message: "Failure: Internal server error"});
        });
    }).catch(function(data) {

        res.status(400).send({message: "Failure: Internal server error"});

    });
});



//A generic database request for all other purpose. Specify the query and the
//type of query and returns either requested data or a success/failure message.
app.post('/DBRequest', function(req, res) {

    let data = JSON.parse(req.body.data);

    let query = data.query;
    let vars = data.vars;
    let type = data.type;

    for (i = 0; i < vars.length; i++) {

        if (vars[i] === "") vars[i] = null;
    }

    if (type === "get") {

        db.any( query, vars ).then(function(data) {

            var response = data;
            res.status(200).send(response);

        }).catch(function(err) {

            console.log(JSON.stringify(err));
            res.status(400).send({message: "Failure: Internal server error"});

        });
    }
    else if (type === "update" || type === "insert" || type === "delete") {

        db.none( query, vars ).then(function(data) {

            res.status(200).send({message: "Success"});

        }).catch(function(err) {

            console.log(JSON.stringify(err));
            res.status(400).send({message: "Failure: Internal server error"});

        });
    }
    else res.status(404).send({message: "Failure: Unknown type."});
});



app.post('/upload', upload.single("file"), function(req, res) {

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



app.post("/delete", function(req, res) {

    let data = JSON.parse(req.body.data);

    if (data.type === "main") {

        var query = "SELECT pid FROM post WHERE image_loc = '" + data.fileName + "'";
        var vars = [];

    } else {

        var query = "SELECT pid FROM post WHERE thumbnail_loc = '" + data.fileName + "'";
        var vars = [];
    }

    db.any( query, vars ).then(function(result) {

        if (result.length === 1) {

            var pathData = data.fileName.split("/");

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
                    var response = {message: "Success"};
                    res.status(200).send(response);
                }
            });
        } else {

            var response = {message: "Success"};
            res.status(200).send(response);
        }
    });
})

//Start Server

app.listen(port, function() {
    console.log("== Server listening on port " + port);
});
