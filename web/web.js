const dns = require('../dns');
const log = require('../logger.js');
const express = require("express");
const session = require('express-session');

const bodyParser = require("body-parser");
const path = require("path");
const config = require("../config.json");
const {logger} = require("../logger");
const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/login", (req, res) => {
    const {name, password} = req.body;

    if (name === "admin" && password === "password") {

        req.session.auth = true;
        req.session.username = name;

        res.redirect("dashboard");
    } else {
        res.render("index");
    }
});

app.get('/endpoint', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (!req.session.auth) { //Replace ! with ''
        let method = req.query.q;
        if (method === 'config') {
            let config = require('../config.json');
            res.send(config);

            if (req.query.debug) {
                config.general.debug = req.query.debug;
            }
            if (req.query.cache) {
                config.general.cache = req.query.cache;
            }
            logger.info(config);
        } else {
            res.send({
                code: 404,
                message: 'Method not found'
            })
        }
        return;
    }
    res.send({
        code: 403,
        message: 'Not authenticated'
    })
})

app.get('/dashboard', (req, res) => {
    if (req.session.auth) {
        res.render('dashboard', {
            username: req.session.username,
            blockedQueries: dns.blockedQ(),
            blockedDomains: dns.blockedD(),
            allowedQueries: dns.allowedQ()
        })

    } else {
        //res.redirect('/');
        res.render('dashboard', {
            username: req.session.username,
            blockedQueries: dns.blockedQ(),
            blockedDomains: dns.blockedD(),
            allowedQueries: dns.allowedQ()
        })
    }
    res.end();
});

app.listen(5000, () => {
    log.logger.info("Web service started on port 5000");
});