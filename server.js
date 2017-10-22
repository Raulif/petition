const express = require('express');
const app = express();
// const router = require('./routers/router')
const hb = require('express-handlebars')
const bodyParser = require('body-parser')
const spicedPg = require('spiced-pg');
const cookieSession = require('cookie-session')
const bcrypt = require('bcryptjs');
var db = spicedPg(process.env.DATABASE_URL || 'postgres:rauliglesias:Fourcade1@localhost:5432/petition');
const session = require('express-session')
const Store = require('connect-redis')(session);
const csurf = require('csurf')

app.use(cookieSession({
    secret: 'a really hard to guess secret',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use('/public', express.static( __dirname + '/public'));


app.use(session({
    store: new Store({
        ttl: 3600,
        host: 'localhost', //for heroku use redis-url from heroku
        port: 6379
    }),
    resave: false,
    saveUninitialized: false,
    secret: 'my super fun secret'
}));
app.use(csurf())

// app.use(router)

app.engine('handlebars', hb())
app.set('view engine', 'handlebars')

function requireUser(req, res, next) {
    if (!req.session.user) {
        console.log('no user session found. I\'ll send you home');
        res.redirect('/register')
    } else {
        console.log('Session user found!');
        next();
    }
}

// :::: PASSWORD HASHING / CHECKING FUNCTIONS :::: //

var hashPassword = function(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

var checkPassword = function(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}



// :::: SERVER REQUESTS :::: //

app.get('/', (req, res) => {
    if(!!req.session.user) {
        res.redirect('/thankyou')
        return;
    }
    else {
        res.redirect('/register')
    }
})

// :::: REGISTER :::: //

app.get('/register', (req, res) => {
    if(!!req.session.user) {
        console.log('Session User found. Taking you to Thankyou');
        res.redirect('/thankyou')
        return;
    }
    else {
        console.log('no session user found');
        res.render('register', {
            layout: 'main',
            csrfToken: req.csrfToken()
        })
    }
})
app.post('/register_new', (req, res) => {
    if(!req.body.firstname || !req.body.lastname || !req.body.email || !req.body.password) {
        let warningId = 'warning-id'
        let warning = "You missed something!! Please complete all fields."
        res.render('register', {
            layout: 'main',
            warning: warning,
            warningId: warningId,
            csrfToken: req.csrfToken(),
            inputReminder: 'inputReminder'
        })
        return
    } else {

        const queryCheckIfEmailExists = `SELECT EXISTS (SELECT false FROM users WHERE email = $1)`
        db.query(queryCheckIfEmailExists, [req.body.email])
        .then((queryResults) => {
            console.log('DOES THIS EMAIL EXIST?', queryResults.rows[0].exists);
            if(queryResults.rows[0].exists) {
                console.log('THE EMAIL EXISTS!!!');
                let warningId = 'warning-id'
                let warning = 'This email is already taken. Please choose a different email or log in.'
                res.render('register', {
                    layout: 'main',
                    csrfToken: req.csrfToken(),
                    warning: warning,
                    warningId: warningId,
                    inputReminder: 'inputReminder'
                })
            }
            else {
                console.log('NO EMAIL :(');
                var firstname = req.body.firstname;
                var lastname = req.body.lastname;
                var email = req.body.email;
                var password = req.body.password;


                req.session.user = {
                    firstname: firstname,
                    lastname: lastname,
                    email: email,
                }

                hashPassword(password).then(function(hash) {
                    const q = `INSERT INTO users (firstname, lastname, email, password) VALUES ($1, $2, $3, $4) RETURNING id`;
                    const params = [firstname, lastname, email, hash];

                    db.query(q, params)
                    .then(results => {
                        const userId = results.rows[0].id
                        req.session.user.id = userId;
                        res.redirect('/profile')
                    })
                    .catch(err => console.log(err));
                })
                .catch(err => console.log(err));

            }

        }).catch(err => console.log("THERE WAS AN ERROR IN /register_new",err));

    }
})


// :::: PROFILE CREATION :::: //

app.get('/profile', requireUser, (req, res) => {
    res.render('profile', {
        layout: 'main',
        showLogout: 'show',
        showBack: 'show',
        csrfToken: req.csrfToken()
    })
})

app.post('/profile_new', (req, res) => {
    var userAge = req.body.age || null
    var userCity = req.body.city || null
    var userHomepage = req.body.homepage || null

    if(req.body.age || req.body.city || req.body.homepage) {
        req.session.user.age = userAge,
        req.session.user.city = userCity,
        req.session.user.homepage = userHomepage

        const q = `INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4)`
        const params = [req.session.user.id, userAge, userCity, userHomepage]

        db.query(q, params)
        .then((results) => {
            res.redirect('/signature')
            res.end()
        })
        .catch(err => console.log(err));
    } else {
        res.redirect('/signature')
    }
})


// :::: USER LOGIN :::: //

app.get('/login', (req, res) => {
    if(!!req.session.user) {
        console.log('Session User found, taking you to Signature');
        res.redirect('/signature')
        return
    }
    else {
        res.render('login', {
            layout: 'main',
            csrfToken: req.csrfToken()
        })
    }
})

app.post('/try_login', (req, res) => {
    if(!req.body.email || !req.body.password) {
        console.log('missing info');
    }
    else {
        var email = req.body.email
        var password = req.body.password

        const q = `SELECT users.firstname, users.id, users.password, signatures.id AS signatureid FROM users FULL JOIN signatures ON users.id = signatures.user_id WHERE users.email = $1`;
        db.query(q, [email])
        .then((queryResults) => {
            console.log(queryResults);
            if(queryResults.rowCount < 1) {
                console.log("wrong login data");
                res.redirect('/login')

            }
            else {
                const loginData = queryResults.rows[0]
                checkPassword(req.body.password, loginData.password)
                .then((doesMatch) => {
                    if(!doesMatch) {
                        console.log("wrong login data");
                        res.redirect('/login')

                    }
                    else{
                        console.log(loginData);
                        req.session.user = {
                            firstname: loginData.firstname,
                            lastname: loginData.lastname,
                            id: loginData.id,
                            signatureId: loginData.signatureid || null
                        }
                        res.redirect('/signature')

                    }
                })
                .catch(err => console.log(err));

            }
        })
        .catch(err => console.log(err));
    }
})


// :::: SIGNATURE :::: //

app.get('/signature', requireUser, (req, res) => {
    if(!!req.session.user.signatureId) {
        console.log('Signature found, taking you to thankyou');
        res.redirect('/thankyou')
        return;
    } else {
        res.render('signature', {
            layout: 'canvas-layout',
            showLogout: 'show',
            csrfToken: req.csrfToken()
        })
    }
})

app.post('/signature_new', (req, res) => {
    var signatureUrl = req.body.signature;
    const q = `INSERT INTO signatures (signature_url, user_id) VALUES ($1, $2) RETURNING id`;
    const params = [signatureUrl, req.session.user.id];
    db.query(q, params)
    .then(results => {
        const id = results.rows[0].id
        req.session.user.signatureId = id;
        res.redirect('/thankyou')
        res.end()
    })
    .catch(err => console.log(err));
})



// :::: THANK YOU :::: //

app.get('/thankyou', requireUser, (req, res) => {
    if(!req.session.user.signatureId) {
        console.log('no signature id found, taking you to signature');
        res.redirect('/signature')
        return
    }
    else {
        const q = `SELECT signature_url FROM signatures WHERE user_id = $1`;
        db.query(q, [req.session.user.id])
        .then(results => {
            var signatureUrl = results.rows[0].signature_url;
            const qq = `SELECT * FROM signatures`
            db.query(qq).then((results) => {
                res.render('thankyou', {
                    layout: 'main',
                    showLogout: 'show',
                    signatureUrl: signatureUrl,
                    amountSignatures: results.rows.length
                })
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    }
})


// :::: SIGNERS LIST :::: //

app.get('/signers', requireUser, (req, res) => {
    const q = `SELECT users.firstname, users.lastname, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users FULL JOIN user_profiles ON users.id = user_profiles.user_id JOIN signatures ON signatures.user_id = users.id`;
    db.query(q)
    .then(results => {
        var signers = results.rows
        console.log(signers);
        res.render('signers', {
            layout: 'main',
            showLogout: 'show',
            showBack: 'show',
            signers: signers
        })
    })
    .catch(err => console.log(err));
})

app.get('/signers/:city', requireUser, (req, res) => {
    var city = req.params.city
    const q = `SELECT users.firstname, users.lastname, user_profiles.age, user_profiles.homepage FROM users JOIN signatures ON signatures.user_id = users.id FULL JOIN user_profiles ON users.id = user_profiles.user_id WHERE user_profiles.city = $1`;
    const params = [city]
    db.query(q, params)
    .then(results => {
        var signers = results.rows;
        res.render('signers', {
            layout: 'main',
            signers: signers,
            city: city,
            showLogout: 'show',
            showBack: 'show',
            from: ' from '
        })
    })
    .catch(err => console.log(err));
})


// :::: PROFILE UPDATE :::: //

app.get('/profile/update', requireUser, (req, res) => {
    const q = `SELECT users.firstname, users.lastname, users.email, users.password, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users FULL JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1`
    db.query(q, [req.session.user.id])
    .then((queryResults) => {
        var userData = queryResults.rows[0]
        res.render('profile_update', {
            layout: 'main',
            showLogout: 'show',
            showBack: 'show',
            userData: userData,
            csrfToken: req.csrfToken()
        })
    })
    .catch(err => console.log(err));
})

app.post('/profile/save', (req, res) => {
    const firstname = req.body.firstname || req.session.user.firstname
    const lastname = req.body.lastname || req.session.user.lastname
    const email = req.body.email || req.session.user.email
    const age = req.body.age || req.session.user.age
    const city = req.body.city || req.session.user.city
    const homepage = req.body.homepage || req.session.user.homepage
    const userId = req.session.user.id
    const password = req.body.password || null


    const queryUpdateUser = `UPDATE users SET firstname = $1, lastname = $2, email = $3 WHERE id = $4`
    db.query(queryUpdateUser, [firstname, lastname, email, userId])
    .then(() => {
        const queryCheckIfProfileExists = `SELECT EXISTS (SELECT false FROM user_profiles WHERE user_id = $1)`
        db.query(queryCheckIfProfileExists, [userId])
        .then((queryResults) => {
            if(queryResults.rows[0].exists) {
                const queryUpdateProfile = `UPDATE user_profiles SET age = $1, city = $2, homepage = $3 WHERE user_id = $4`
                db.query(queryUpdateProfile, [age, city, homepage, userId])
            } else {
                if (age || city || homepage) {
                    const queryInsertProfile = 'INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4)'
                    db.query(queryInsertProfile, [userId, age, city, homepage])
                }
            }
            if(password) {
                hashPassword(password).then((hash) => {
                    const queryUpdatePassword = `UPDATE users SET password = $1 WHERE id = $2`
                    db.query(queryUpdatePassword, [hash, userId])
                })

            }
            res.redirect('/thankyou')
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
})

app.get('/delete_signature', (req, res) => {
    const queryDeleteSignature = `DELETE FROM signatures WHERE user_id = $1`
    db.query(queryDeleteSignature, [req.session.user.id])
    .then(() => {
        req.session.user.signatureId = "";
        res.redirect('/signature');
    })
    .catch(err => console.log(err));
})

app.get('/logout', (req, res) =>{
    req.session = null;
    console.log(req.session);
    res.redirect('/register');
})

// :::: LISTENING ON PORT :::: //

app.listen(process.env.PORT || 8000, () => console.log('listening'));
