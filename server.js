const express = require('express');
const app = express();
const hb = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const spicedPg = require('spiced-pg');
const cookieSession = require('cookie-session')

var db = spicedPg('postgres:rauliglesias:Fourcade1@localhost:5432/petition');

app.use(cookieSession({
    secret: 'a really hard to guess secret',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));

app.use(cookieParser())

app.engine('handlebars', hb())
app.set('view engine', 'handlebars')

app.use(bodyParser.urlencoded({
    extended: false
}));


app.use('/public', express.static( __dirname + '/public'));

app.get('/petition', (req, res) => {
    if(!req.cookies.petition) {
        res.render('petition', {
            layout: 'main',
        })
    } else {
        res.redirect('/thankyou')
    }
})

app.get('/thankyou', (req, res) => {
    const id = req.session.signatureid;
    console.log(id);
    const q = `SELECT signatureurl FROM signatures WHERE signatureid = ${id};`;
    db.query(q)
    .then(results => {
        var signatureUrl = results.rows[0].signatureurl;
        console.log(signatureUrl)
        res.render('thankyou', {
            layout: 'main',
            signatureUrl: signatureUrl
        })
    }).catch(err => console.log(err));
})

app.post('/petition', (req, res) => {
    if(!req.body.firstname || !req.body.lastname || !req.body.signature) {
        var reminderId = 'reminder-id'
        var reminder = "You missed something!! Please enter BOTH first AND last name AND don't forget to sign. That's what you're here for silly :) !!!"
        res.render('petition', {
            layout: 'main',
            reminder: reminder,
            reminderId: reminderId,
        })
    } else {
        var firstname = req.body.firstname;
        var lastname = req.body.lastname;
        var signatureurl = req.body.signature;
        const q = `INSERT INTO signatures (firstname, lastname, signatureurl) VALUES ($1, $2, $3) RETURNING signatureid`;
        const params = [firstname, lastname, signatureurl];
        res.cookie('petition', 'signed')
        db.query(q, params)
            .then(results => {
                const id = results.rows[0].signatureid
                req.session.signatureid = id;
                res.redirect('/thankyou')
                res.end()
            })
            .catch(err => console.log(err));
    }
})

app.get('/userlist', (req, res) => {
    const q = `SELECT firstname, lastname FROM signatures`;
    db.query(q)
        .then(result => {
            var users = result.rows
            var firstname = users.firstname
            var lastname = users.lastname

            res.render('userlist', {
                layout: 'main',
                users: users,
                firstname: firstname,
                lastname: lastname
            })
        })
        .catch(err => console.log(err));

})

app.listen(8000, () => console.log('listening'));
//
// canvas.toDataURL ---> that is the string we want to submit to db
//
//
//
// CREATE TABLE signature (
//     id SERIAL PRIMARY KEY,
//     first VARCHAR(300) NOT NULL,
//     last VARCHAR(400) NOT NULL,
//     signature TEXT NOT NULL
// )
//
//
// handlebars:
//
// welcom, please signature
// form method=post
//     <input name=first>
//     <input name=local>
//     <input type=hidden name=signature> --->on submit click , $('input[name=signature]').val($('canvas')[0].toDataURL()) /canvas
//
//     button submit /button
// form
//
//
// you know if success if you get to write the data on db.
// redirect to thank you page. before that send cookie saying signed.
// if user has not signed, shoudl not be able to see the thank you page.
// page with signatures does not show signatures, they are private.
//
//
// set db TABLE
// create public folder
// create 3 templates: petition, thnkyou, signers
// js for signature canvas
// post handler to check if no input or redirect user. if ok, res.redirect(/petition).
// on thnky page, link to signer page
// on signers page, show ppl who signed.
//
