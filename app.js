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

const upload = multer({ dest: "uploads/" });

//Web Pages

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.get('/admin', function(req, res) {
    res.sendFile(path.join(__dirname, '/admin.html'));
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

//Inserts submitted login info to database and handles hashword passing.
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

        db.any( 'SELECT * FROM "post" ORDER BY pid' )
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

    console.log(req.body.data);

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
})

//Start Server

app.listen(port, function() {
    console.log("== Server listening on port " + port);
});
