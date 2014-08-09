/**
 * Created by iddogino on 9/08/14.
 */

var mongojs = require('mongojs');

var db = mongojs('localhost/test', ['users']);

var triggers = require('./index.js');

triggers(db.users).save(
    function(document, next) {
        if(document.name = "Iddo Gino")
            next("Exists");
    }
);

triggers(db.users).on('save', function(err,res,query,update,ops) {
    console.log("saved");
});

db.users.save({name:"Iddo Gino", password:"Hard2Crack"}, function(err, res) {
    if(err)
        console.log(err);
    console.log("Saved!");
});