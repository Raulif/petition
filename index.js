const express = require('express');
const app = express();
// const router = require('./routers/router')
const hb = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const db = require('./db-queries/db-queries')
const bcrypt = require('bcryptjs');
const session = require('express-session')
const Store = require('connect-redis')(session);
const csurf = require('csurf')


//---------------------------- MIDDLEWARE ------------------------------------//

//COOKIE SESSION
app.use(cookieSession({
    secret: 'a really hard to guess secret',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));

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

//BODY PARSER
app.use(bodyParser.urlencoded({
    extended: false
}));


//EXPRESS STATIC
app.use('/public', express.static( __dirname + '/public'));

//CSURF
app.use(csurf())

// app.use(router)

//HANDLEBARS - VIEW ENGINE
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

//PASSWORD HASHING / CHECKING FUNCTIONS

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


//-------------------------- ROUTES ------------------------------------------//


// :::: HOME :::: //

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
            hidegreet: 'hide-greet',
            csrfToken: req.csrfToken()
        })
    }
})

app.post('/register_new', (req, res) => {

    if(!req.body.firstname || !req.body.lastname || !req.body.email || !req.body.password) {

        let warningId = 'warning-id';
        let warning = 'You missed something!! Please complete all fields.';

        res.render('register', {
            layout: 'main',
            warning: warning,
            warningId: warningId,
            hidegreet: 'hide-greet',
            csrfToken: req.csrfToken(),
            inputReminder: 'inputReminder'
        })

        return

    }

    else {

        let {firstname, lastname, email, password} = req.body

        db.checkEmail(email)

            .then(results => {

            if(!results.success) {

                let warningId = 'warning-id'
                let warning = 'This email is already taken. Please choose a different email or log in.'

                res.render('register', {
                    layout: 'main',
                    csrfToken: req.csrfToken(),
                    warning: warning,
                    hidegreet: 'hide-greet',
                    warningId: warningId,
                    inputReminder: 'inputReminder'
                })
            }

            else {

                req.session.user = {
                    firstname: firstname,
                    lastname: lastname,
                    email: email
                }

                hashPassword(password)

                .then(hash => {

                    db.postNewUser(firstname, lastname, email, hash)

                        .then(results => {

                            if(results.success) {
                                const userId = results.id
                                req.session.user.id = userId;
                                res.redirect('/profile')
                            }
                        })

                        .catch(err => console.log(err));
                    })

                    .catch(err => console.log(err));
            }
        })

        .catch(err => console.log("THERE WAS AN ERROR IN /register_new",err));
    }
})


// :::: PROFILE CREATION :::: //

app.get('/profile', requireUser, (req, res) => {

    res.render('profile', {
        layout: 'main',
        showLogout: 'show',
        firstname: req.session.user.firstname,
        csrfToken: req.csrfToken()
    })
})

app.post('/profile_new', (req, res) => {

    var userAge = req.body.age || null
    var userCity = req.body.city || null
    var userHomepage = req.body.homepage || null


    if(req.body.age || req.body.city || req.body.homepage) {

        req.session.user.age = userAge
        req.session.user.city = userCity
        req.session.user.homepage = userHomepage

        db.postUserProfile(req.session.user.id, userAge, userCity, userHomepage)

        .then(results => {
            if(results.success){
                res.redirect('/signature')
                res.end()
            }
        })

        .catch(err => console.log(err));
    }

    else {
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
            hidegreet: 'hide-greet',
            csrfToken: req.csrfToken()
        })
    }
})


app.post('/try_login', (req, res) => {

    if(!req.body.email || !req.body.password) {

        let failedLoginId = 'failed-login'
        let failedLogin = 'Wrong email or password. Please try again!'
        console.log("missing login input");

        res.render('login', {
            layout: 'main',
            failedLoginId: failedLoginId,
            inputReminder: 'inputReminder',
            failedLogin: failedLogin,
            hidegreet: 'hide-greet',
            csrfToken: req.csrfToken()
        })
    }

    else {
        let {email, password} = req.body.email

        db.getUserInfo(email)
        .then(results => {

            if(!results.success) {

                let failedLoginId = 'failed-login'
                let failedLogin = 'Wrong email or password. Please try again!'
                console.log("wrong login details");

                res.render('login', {
                    layout: 'main',
                    failedLoginId: failedLoginId,
                    inputReminder: 'inputReminder',
                    failedLogin: failedLogin,
                    hidegreet: 'hide-greet',
                    csrfToken: req.csrfToken()
                })
            }

            else {

                const userInfo = results.userInfo

                checkPassword(req.body.password, userInfo.password)

                .then(doesMatch => {

                    if(!doesMatch) {

                        let failedLoginId = 'failed-login'
                        let failedLogin = 'Wrong email or password. Please try again!'
                        console.log("wrong password data");

                        res.render('login', {
                            layout: 'main',
                            failedLoginId: failedLoginId,
                            inputReminder: 'inputReminder',
                            failedLogin: failedLogin,
                            hidegreet: 'hide-greet',
                            csrfToken: req.csrfToken()
                        })
                    }

                    else{

                        req.session.user = {
                            firstname: userInfo.firstname,
                            lastname: userInfo.lastname,
                            id: userInfo.id,
                            signatureId: userInfo.signatureid || null
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
        res.redirect('/thankyou')
        return;
    }

    else {

        res.render('signature', {
            layout: 'canvas-layout',
            showLogout: 'show',
            firstname: req.session.user.firstname,
            csrfToken: req.csrfToken()
        })
    }
})


app.post('/signature_new', (req, res) => {

    const signatureUrl = req.body.signature;

    db.postNewSignature(signatureUrl, req.session.user.id)
            .then(results => {

                if(results.success) {
                    req.session.user.signatureId = results.id;
                    res.redirect('/thankyou')
                    res.end()
                }
            })

            .catch(err => console.log(err));
})



// :::: THANK YOU :::: //

app.get('/thankyou', requireUser, (req, res) => {

    if(!req.session.user.signatureId) {

        res.redirect('/signature')
        return
    }

    else {

        db.getSignatures(req.session.user.id)

        .then(results => {

            res.render('thankyou', {
                layout: 'main',
                showLogout: 'show',
                firstname: req.session.user.firstname,
                signatureUrl: results.userSignatureUrl,
                amountSignatures: results.amountSignatures
            })
        })

        .catch(err => console.log(err));
    }
})


// :::: SIGNERS LIST :::: //

app.get('/signers', requireUser, (req, res) => {

    db.getSigners()

        .then(results => {

            res.render('signers', {
                layout: 'main',
                showLogout: 'show',
                showBack: 'show',
                firstname: req.session.user.firstname,
                signers: results.signers
            })
    })
    .catch(err => console.log(err));
})


app.get('/signers/:city', requireUser, (req, res) => {

    const city = req.params.city

    db.getUsersByCity(city)

        .then(results => {
            const signers = results.signers;

            res.render('signers', {
                layout: 'main',
                signers: signers,
                city: city,
                showLogout: 'show',
                showBack: 'show',
                firstname: req.session.user.firstname,
                from: ' from '
            })
        })

        .catch(err => console.log(err));
})


// :::: PROFILE UPDATE :::: //

app.get('/profile/update', requireUser, (req, res) => {

    db.getProfileInfo(req.session.user.id)

        .then(results => {
            const userInfo = results.userInfo

            res.render('profile_update', {
                layout: 'main',
                showLogout: 'show',
                showBack: 'show',
                userData: userInfo,
                firstname: req.session.user.firstname,
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


    db.updateUserInfo(firstname, lastname, email, userId)

        .then(() => {

            db.checkProfile(userId)
            .then(results => {
                if(results.success) {

                    db.updateProfile(age, city, homepage, userId)

                } else {

                    if (age || city || homepage) {
                        db.insertProfile(userId, age, city, homepage)
                    }
                }
                if(password) {
                    hashPassword(password)

                    .then(hash => {
                        db.updatePassword(hash, userId)
                    })
                    .catch(err => console.log(err));
                }
                res.redirect('/thankyou')
        })

        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
})


// :::: DELETE SIGNATURE :::: //

app.get('/delete_signature', (req, res) => {

    db.deleteSignature(req.session.user.id)
        .then(results => {

            if(results.success) {
                req.session.user.signatureId = "";
                res.redirect('/signature');
            }
        })

        .catch(err => console.log(err));
})

app.get('/logout', (req, res) =>{

    req.session = null;
    res.redirect('/register');
})

// :::: LISTENING ON PORT :::: //

app.listen(process.env.PORT || 8000, () => console.log('listening on port: 8000'));
