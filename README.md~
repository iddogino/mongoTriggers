MongoDB Triggers
================

This light weight library was written to mimic the triggers feature found in many SQL server, and much needed in mongoDB. 

There are 2 types of triggers:

- **Triggers** - these will function as middleware, and thus will be called before the database operation is executed. Within these triggers, you may modify the query (or inserted document), or check the data, and abort the operation if it is incorrect. At the end of the trigger function, you must call *next()* to proceed. If you pass a parameter to the *next()* function, it'll abort execution, and pass it as an argument to the callback function. A possible use for triggers may be to check whether an email exists in the database before inserting a user with that email, or to add a joinedOn date when a new user is saved. 

- **Listeners** - these will be called following the execution of the database operation. A use for listeners may be to update additional pieces of data following the operation, or notify someone about the operation.

Triggers
--------

    //Add a trigger to db.user.save()
    triggers(db.users).save(function(document, next) {
        //...
        next();
    });
    
    //Add a trigger to db.user.insert()
    triggers(db.users).insert(function(document, next) {
        //...
        next();
    });
    
    //Add a trigger to db.user.update()
    triggers(db.users).update(function(query, <update>, <options>, next) {
        //...
        next();
    });
    
    //Add a trigger to db.user.remove()
    triggers(db.users).remove(function(query, next) {
        //...
        next();
    });
    
    
Triggers can abort execution like that:

    triggers(db.users).save(function(document, next) {
        //Check if a user with the same email exists in data base:
        db.users.findOne({email:document.email}, function(err,doc) {
            if(doc)
                next(new Error());
            else
                next();
        });
    });
    
Filters can also modify the document:

    triggers(db.users).save(function(document, next) {
        //Add a 'created' date to the new user
        document.created = new Date();
        next();
    });
    
Listeners
---------

Listeners are created using the 'on' function:

    triggers(db.members).on('save', function (error, result, query, update, options) {
      // error   : null (unless something went wrong)
      // result  : { ... } (in case of the save command, this will be a lastErrorObject)
      // query   : { _id: "foo" }
      // update  : { name: "Anders" }
      // options : undefined (since no options object was passed to the update function)
    });
    
Chaining:
---------

Operation may also be chained like that:

    triggers(db.members)
        .update(function(query, <update>, <options>, next) {})
        .save(function(document, next) {})
        .on('remove', function(error, result, document) {});
   



