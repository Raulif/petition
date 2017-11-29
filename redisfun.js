var redis = require('redis');
var client = redis.createClient({
    host: 'localhost',
    port: 6379
});

client.on('error', function(err) {
    console.log(err); //handle the error, otherwise node will crash
});

//Client is like redis client

client.set('funky', 'chicken', function(err, data) {
    console.log(err || data);
})
//run on terminal (node redisfun.js) returns OK if worked. If OK, this is a cash-HIT.

var obj = {
    cute: true,
    ugly, false
}

client.setex ('funky', 30, JSON.toString(obj), function(err, data) {
    if (err) {
        console.log(err);
        return;
    }
    client.get('funky', function (err, data) {
        console.log(err || JSON.parse(data));
    })
    client.get('funky', function(err, data) {
        if(err) {
            console.log(err);
        } else {
            console.log(('success: ' + data)); //this is a cash-MISS. you do not get an error, you just get null. 'success: null'
            client.del('funky', function(err, data) {
                console.log('deleted'); //returns 'deleted' since it succeeded HIT
            })
        }
    })
})

//all values you pass to redis must be string. not obj, for example.
//pass obj to string. when you get it out you have to JSON.parse it, so you return again an object.


module.exports.get = function(key) {
    return new Promise(function(resolve, reject){
        client.get(key, function(err, data){
            if (err) {
                reject(err)
            } else  {
                resolve(data)
            }
        })

    })
}




//For project
//look in cash first. First time it will fail, since cash empty
myRedisClient.get('signers').then(funciton(signers) {
    if (signers {
        res.render('signes', {
            layout: 'main',
            signers: signers
        })

    })
    else { //look in real source
        return db.query(`SELECT * FROM signers`)
    }
}).then(function(signers) {
    myRedisClient.setex(signers, 300, function() { //set in cash. next time within 300 secs it will work.
        res.render('signers', {
            signers.....
        })
        //json stringify, json parse...
    })
})

//cash-validation
//if any change in db, you need to call delete on redis, because is not valid anymore.
