let http = require("http");
let fs = require("fs");
let path = require("path");
let express = require("express");
let promise = require("bluebird");
let bodyParser = require("body-parser");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
let bcrypt = require("bcryptjs");

const initOptions = {
    promiseLib: promise
}
let pgp = require("pg-promise")(initOptions);

// Hardcoded database connection data for running locally.
// Needs to be reset every few weeks, comment out before making commits.
const cn = {
    host: "ec2-107-22-216-151.compute-1.amazonaws.com",
    port: 5432,
    database: "d2risv9l0s4qkg",
    user: "sziueutmcjzjtv",
    password: "fd7d58d2bdb9952599ba3a03b6a8286fa9efc8a05e296b375458f2235aed26e3",
    ssl: true
};

// Env variable for database connection for use in Heroku environment.


let db = pgp(cn);

let app =express();
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

        console.log("Data: " + JSON.stringify(data));
        bcrypt.compare(password, data.password, function(err, result) {

            if (err) {

                console.log("Error: " + JSON.stringify(err));
                var response = {status: "Failure: Internal server error", authorize: false};
                res.status(400).send(response);
                return;
            }

            if (result) {

                if (data.admin_status) var response = {status: "Success", authorize: true};
                else var response = {status: "Success", authorize: false};
            }
            else var response = {status: "Failure: Incorrect password", authorize: false};

            res.status(200).send(response);
        });

    }).catch(function(err) {

        console.log("Error: " + JSON.stringify(err));
        var response = {status: "Failure: account not found", authorize: "No"};
        res.status(400).send(response);
    });
});

//Inserts submitted login info to database and handles hashword passing.
app.post('/signUp', function(req, res) {

    var email = req.body.email;
    var password = req.body.password;

    bcrypt.genSalt(10, function(err, salt) {

        if (err) {
            console.log("Error: " + JSON.stringify(err));
            var response = {status: "Failure: Internal server error", authorize: false};
            res.status(400).send(response);
            return;
        }

        bcrypt.hash(password, salt, function(err, hash) {

            if (err) {
                console.log("Error: " + JSON.stringify(err));
                var response = {status: "Failure: Internal server error"};
                res.status(400).send(response);
                return;
            }

            db.none('INSERT INTO "user"("email", "password", "admin_status")' +
                    'VALUES($1, $2, false)', [email, hash])
            .then(function(data) {

                var response = {status: "Success"};
                res.status(200).send(response);

            }).catch(function(data) {

                var response = {status: "Failure: Internal server error"};
                res.status(400).send(response);
            })
        });

    });
});

//Returns all content for intitally rendering the page.
app.post('/getEntries', function(req, res) {

    db.any( 'SELECT * FROM "collection"' )
    .then(function(collections) {

        console.log(JSON.stringify(collections));

            db.any( 'SELECT * FROM "post"' )
            .then(function(posts) {

                var response = {collections: collections, posts: posts};
                res.status(200).send(response);

            }).catch(function(err) {

                var response = {status: "Failure: Internal server error"};
                res.status(400).send(response);
            });

    }).catch(function(data) {

        var response = {status: "Failure: Internal server error"};
        res.status(400).send(response);

    });
});

//A generic database request for all other purpose. Specify the query and the
//type of query and returns either requested data or a success/failure message.
app.post('/DBRequest', function(req, res) {

    let data = JSON.parse(req.body.data);

    let query = data.query;
    let vars = data.vars;
    let type = data.type;

    if (type === "get") {

        db.any( query, vars ).then(function(data) {

            var response = data;
            res.status(200).send(response);

        }).catch(function(err) {

            console.log(err);
            var response = {status: "Failure: Internal server error"};
            res.status(400).send(response);

        });
    }
    else if (type === "update" || type === "insert") {

        db.none( query, vars ).then(function(data) {

            var response = "Success";
            res.status(200).send(response);

        }).catch(function(err) {

            console.log(err);
            var response = {status: "Failure: Internal server error"};
            res.status(400).send(response);

        });
    }
    else {

        var response = {status: "Failure: Internal server error"};
        res.status(400).send(response);
    }
});

//Start Server

app.listen(port, function() {
    console.log("== Server listening on port " + port);
});
