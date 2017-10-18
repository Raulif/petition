const express = require('express');
const app = express();
const hb = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const spicedPg = require('spiced-pg');
const cookieSession = require('cookie-session')
const bcrypt = require('bcryptjs');
const csurf = require('csurf')
var db = spicedPg(process.env.DATABASE_URL || 'postgres:rauliglesias:Fourcade1@localhost:5432/petition');

app.use(cookieSession({
    secret: 'a really hard to guess secret',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));
app.use(cookieParser())
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use('/public', express.static( __dirname + '/public'));
app.use(csurf())

app.engine('handlebars', hb())
app.set('view engine', 'handlebars')


// :::: PASSWORD HASHING AND CHECKING FUNCTIONS :::: //

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
    if(req.session.user) {
        res.redirect('/signature')
    } else {
        res.redirect('/register')
    }
})

// :::: REGISTER :::: //

app.get('/register', (req, res) => {
    res.render('register', {
        layout: 'main',
        csrfToken: req.csrfToken()
    })
})

app.post('/register_new', (req, res) => {
    if(!req.body.firstname || !req.body.lastname || !req.body.email || !req.body.password) {
        var reminderId = 'reminder-id'
        var reminder = "You missed something!! Please complete all fields."
        res.render('register', {
            layout: 'main',
            reminder: reminder,
            reminderId: reminderId,
            csrfToken: req.csrfToken()
        })
        return
    }
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var email = req.body.email;
    var password = req.body.password;

    req.session.user = {
        firstname: firstname,
        lastname: lastname,
        email: email
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

})


// :::: PROFILE CREATION :::: //

app.get('/profile', (req, res) => {
    res.render('profile', {
        layout: 'main',
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
    res.render('login', {
        layout: 'main',
        csrfToken: req.csrfToken()
    })
})

app.post('/try_login', (req, res) => {
    if(!req.body.email || !req.body.password) {
        console.log('missing info');
        return ;
    }
    var email = req.body.email
    var password = req.body.password

    hashPassword(password).then((hash) => {
        const q = `SELECT users.firstname, users.id, users.password, signatures.id AS signatureid FROM users JOIN signatures ON users.id = signatures.user_id WHERE users.email = $1`;
        db.query(q, [email])
        .then((queryResults) => {
            if(queryResults.rowsCount < 1) {
                console.log("wrong login data");
                res.redirect('/login')
                return
            }
            const loginData = queryResults.rows[0]
            console.log(loginData, hash);
            checkPassword(req.body.password, hash)
            .then((doesMatch) => {
                if(!doesMatch) {
                    console.log("wrong login data");
                    res.redirect('/login')
                    return
                }
                req.session.user = {
                    firstname: loginData.firstname,
                    lastname: loginData.lastname,
                    id: loginData.id,
                    signatureId: loginData.signatureid
                }
                res.redirect('/signature')
            })
            .catch(err => console.log(err));

        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
})


// :::: SIGNATURE :::: //

app.get('/signature', (req, res) => {
    if(req.session.user.signatureId) {
        res.redirect('/thankyou')
        return
    }
    if(!req.session.user) {
        res.redirect('/register')
        return
    }
    res.render('signature', {
        layout: 'main',
        csrfToken: req.csrfToken()
    })
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

app.get('/thankyou', (req, res) => {
    if(!req.session.user) {
        res.redirect('/register')
        return
    }
    const q = `SELECT signature_url FROM signatures WHERE id = $1`;
    db.query(q, [req.session.user.signatureId])
    .then(results => {
        var signatureUrl = results.rows[0].signature_url;
        const qq = `SELECT * FROM signatures`
        db.query(qq).then((results) => {
            res.render('thankyou', {
                layout: 'main',
                signatureUrl: signatureUrl,
                amountSignatures: results.rows.length
            })
        })
    })
    .catch(err => console.log(err));

})


// :::: SIGNERS LIST :::: //

app.get('/signers', (req, res) => {
    if(!req.session.user) {
        res.redirect('/register')
        return
    }
    const q = `SELECT users.firstname, users.lastname, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users FULL JOIN user_profiles ON users.id = user_profiles.user_id`;
    db.query(q)
    .then(results => {
        var signers = results.rows

        res.render('signers', {
            layout: 'main',
            signers: signers
        })

    })
    .catch(err => console.log(err));
})

app.get('/signers/:city', (req, res) => {
    if(!req.session.user) {
        res.redirect('/register')
        return
    }
    var city = req.params.city
    const q = `SELECT users.firstname, users.lastname, user_profiles.age, user_profiles.homepage FROM users FULL JOIN user_profiles ON users.id = user_profiles.user_id WHERE user_profiles.city = $1`;
    const params = [city]
    db.query(q, params)
    .then(results => {
        var signers = results.rows

        res.render('signers', {
            layout: 'main',
            signers: signers,
            city: city
        })
    })
    .catch(err => console.log(err));
})


// :::: PROFILE UPDATE :::: //

app.get('/profile/update', (req, res) => {
    const q = `SELECT users.firstname, users.lastname, users.email, users.password, user_profiles.age, user_profiles.city, user_profiles.homepage FROM users JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = $1`
    db.query(q, [req.session.user.id])
    .then((queryResults) => {
        var userData = queryResults.rows[0]
        res.render('profile_update', {
            layout: 'main',
            userData: userData,
            csrfToken: req.csrfToken()
        })
    })
    .catch(err => console.log(err));
})

// :::: LISTENING ON PORT :::: //

app.listen(process.env.PORT || 8000, () => console.log('listening'));
