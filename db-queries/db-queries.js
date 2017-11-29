const spicedPg = require('spiced-pg');
const db = spicedPg(process.env.DATABASE_URL || 'postgres:rauliglesias:Fourcade1@localhost:5432/petition');


//CHECK EMAIL
module.exports.checkEmail = (email) => {

    const query = ` SELECT EXISTS
                    (SELECT false
                    FROM users
                    WHERE email = $1)`

    const params = [email]

    return db.query(query, params)

            .then(results => {
                if(queryResults.rows[0].exists) {
                    return({ success: false })
                }

                return({ success: true })
            })

            .catch(err => console.log("error in // DB-QUERIES // CHECK EMAIL",err));
}


//POST NEW USER
module.exports.postNewUser = (firstname, lastname, email, hash) => {

    const query = ` INSERT INTO users
                    (firstname, lastname, email, password)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`

    const params = [firstname, lastname, email, hash]

    return db.query(query, params)

            .then(results => {

                if(results.rowCount < 1) {
                    return({ success: false })
                }

                return({
                    success: true,
                    id: results.rows[0].id
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // POST NEW USER",err));
}


//POST USER PROFILE
module.exports.postUserProfile = (userId, userAge, userCity, userHomepage) => {

    const query = ` INSERT INTO user_profiles
                    (user_id, age, city, homepage)
                    VALUES ($1, $2, $3, $4)`

    const params = [userId, userAge, userCity, userHomepage]

    return db.query(query, params)

            .then(() => return({success: true}))
            
            .catch(err => console.log("error in // DB-QUERIES // POST USER PROFILE",err));

}


//GET USER INFO
module.exports.getUserInfo = (email) => {

    const query = ` SELECT  users.firstname,
                            users.id, users.password,
                            signatures.id AS signatureid
                    FROM users FULL JOIN signatures
                    ON users.id = signatures.user_id
                    WHERE users.email = $1`

    const params = [email]

    return db.query(query, params)

            .then(results => {
                if(results.rowCount < 1) {
                    return({success: false})
                }

                return({
                    success: true,
                    userInfo: results.rows[0]
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // GET USER INFO",err));

}

//POST NEW SIGNATURE
module.exports.postNewSignature = (signatureUrl, userId) => {

    const query = ` INSERT INTO signatures
                    (signature_url, user_id)
                    VALUES ($1, $2)
                    RETURNING id`

    const params = [signatureUrl, userId]

    return db.query(query, params)

            .then(results => {
                return({
                    success: true,
                    id: results.rows[0].id
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // POST NEW SIGNATURE",err));
}

//GET SIGNATURES
module.exports.getSignatures = (userId) => {

    const query = ` SELECT *
                    FROM signatures`

    return db.query(query)

            .then(results => {

                const userSignature = results.rows.find(signature => {
                    signature.user_id == userId
                })

                const userSignatureUrl = userSignature.signature_url

                return({
                    success: true,
                    userSignatureUrl,
                    amountSignatures: results.rows.length
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // GET SIGNATURES",err));
}

//GET SIGNERS
module.exports.getSigners = () => {

    const query = ` SELECT  users.firstname,
                            users.lastname,
                            user_profiles.age,
                            user_profiles.city,
                            user_profiles.homepage
                    FROM users FULL JOIN user_profiles
                    ON users.id = user_profiles.user_id
                    JOIN signatures ON signatures.user_id = users.id`

    return db.query(query)

            .then(results => {

                return({
                    success: true,
                    signers: results.rows
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // GET SIGNERS",err));

}


//GET USERS BY CITY
module.exports.getUsersByCity = (city) => {

    const query = ` SELECT  users.firstname,
                            users.lastname,
                            user_profiles.age,
                            user_profiles.homepage
                    FROM users JOIN signatures
                    ON signatures.user_id = users.id
                    FULL JOIN user_profiles
                    ON users.id = user_profiles.user_id
                    WHERE user_profiles.city = $1`

    const params = [city]

    return db.query(query)

            .then(results => {

                return({
                    success: true,
                    signers: results.rows
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // GET USERS BY CITY",err));

}

//GET PROFILE INFO
module.exports.getProfileInfo = (userId) => {

    const query = ` SELECT  users.firstname,
                            users.lastname,
                            users.email,
                            users.password,
                            user_profiles.age,
                            user_profiles.city,
                            user_profiles.homepage
                    FROM users FULL JOIN user_profiles
                    ON users.id = user_profiles.user_id
                    WHERE users.id = $1`

    const params = [userId]

    return db.query(query, params)

            .then(results => {
                return({
                    success: true,
                    userInfo: results.rows[0]
                })
            })

            .catch(err => console.log("error in // DB-QUERIES // GET PROFILE INFO",err));

}

//UPDATE USER INFO
module.exports.updateUserInfo = (firstname, lastname, email, userId) => {

    const query = ` UPDATE users
                    SET firstname = $1,
                        lastname = $2,
                        email = $3
                    WHERE id = $4`

    const params = [firstname, lastname, email, userId]

    return db.query(query, params)

            .then(() => return({success: true}))

            .catch(err => console.log("error in // DB-QUERIES // UPDATE USER INFO",err));
}


//CHECK IF PROFILE EXISTS
module.exports.checkProfile = (userId) => {

    const query = ` SELECT EXISTS (SELECT false
                    FROM user_profiles
                    WHERE user_id = $1)`

    const params = [userId]

    return db.query(query, params)

            .then(results => {
                if(!results.rows[0].exists) {
                    return({success: false})
                }

                return({success: true})
            })

            .catch(err => console.log("error in // DB-QUERIES // CHECK PROFILE",err));
}


//UPDATE PROFILE
module.exports.updateProfile = (age, city, homepage, userId) => {

    const query = ` UPDATE  user_profiles
                    SET age = $1,
                        city = $2,
                        homepage = $3
                    WHERE user_id = $4`

    const params = [age, city, homepage, userId]

    return db.query(query, params)

            .then(() => return({success: true}))

            .catch(err => console.log("error in // DB-QUERIES // UPDATE PROFILE",err));
}

//INSERT PROFILE
module.exports.insertProfile = (userId, age, city, homepage) => {

    const query = ' INSERT INTO user_profiles
                    (user_id, age, city, homepage)
                    VALUES ($1, $2, $3, $4)'

    const params = [userId, age, city, homepage]

    return db.query(query, params)

            .then(() => return({success: true}))

            .catch(err => console.log("error in // DB-QUERIES // INSERT PROFILE",err));
}

//UPDATE PASSWORD
module.exports.updatePassword = (hash, userId) => {

    const query = ` UPDATE users
                    SET password = $1
                    WHERE id = $2`

    const params = [hash, userId]

    return db.query(query, params)

            .then(() => return({success: true}))

            .catch(err => console.log("error in // DB-QUERIES // UPDATE PASSWORD",err));
}


//DELETE SIGNATURE
module.exports.deleteSignature = (userId) => {

    const query = ` DELETE FROM signatures
                    WHERE user_id = $1`

    const params = [userId]

    return db.query(query, params)

            .then(() => return({success: true}))

            .catch(err => console.log("error in // DB-QUERIES // DELETE SIGNATURE",err));

}
