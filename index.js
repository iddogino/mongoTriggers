/**
 * Created by iddogino on 4/08/14.
 */

var clone = require('clone');

var nop = function() {}; //An empty function

//Returns a function, that when called with arguments A, will call fn([A]) followed by injectFn([A])
//This will make injectFn execute after fn, when calling the returned function (both will be called with the arguments given to the returned function
var injectAfter = function(fn,injectFn) {

    return function () {
        var args = arguments; //These are the arguments the returned function was called with, and thus fn and injectFn will be called with these arguments
        fn.apply(null,args); //Calling fn first
        process.nextTick(function() {
            injectFn.apply(null,args); //Will call injectFn on the next round
        });
    };
};

//Adding a before trigger: module(collection).operation() -> module(users).save(triggerFunction);
module.exports = function(collection) {
    //Will holds all functions that will be called before each action
    var triggers = {
        save:[],
        insert:[],
        update:[],
        remove:[]
    };

    //Will hold all functions that will be called after each action
    var listeners = {
        save:[],
        insert:[],
        update:[],
        remove:[]
    };

    //This will be returned. Each action that will be chosen will lead to the addition of a trigger to it. Each one returns a chainer object for chaining.
    var chainer = {
        save: function (trigger) {
            triggers.save.push(trigger);
            return chainer;
        },
        insert: function (trigger) {
            triggers.insert.push(trigger);
            return chainer;
        },
        update: function (trigger) {
            triggers.update.push(trigger);
            return chainer;
        },
        remove: function (trigger) {
            triggers.remove.push(trigger);
            return chainer;
        },
        on: function(event, trigger) { //This will add after-triggers
            listeners[event].push(trigger);
            return chainer;
        }
    };


    //This will create a function that performs all the triggers for fn, then fn, that all it's after-triggers
    var injectTriggers = function(fn,triggers,listeners) {
        return function() {
            var index = 0;
            var args = Array.prototype.slice.call(arguments);
            var callback = nop;

            if(typeof args[args.length -1] === 'function') {

                callback = args.pop();

                if(listeners.length > 0) {
                    var originArgs = clone(args);
                    callback = injectAfter(callback, function() {

                        var listenerArgs = Array.prototype.slice.call(arguments).concat(originArgs);
                        listeners.forEach(function (listener) {
                            listener.apply(collection, listenerArgs);
                        });
                    });
                }
            }

            var next = function(err) {
                if(err) return callback(err);
                var trigger = triggers[index++];
                if(!trigger) return fn.apply(collection, args.concat(callback));
                trigger.apply(collection, args.concat(next));
            };

            next();
        };
    };

    collection.save = injectTriggers(collection.save, triggers.save, listeners.save);
    collection.insert = injectTriggers(collection.insert, triggers.insert, listeners.insert);
    collection.update = injectTriggers(collection.update, triggers.update, listeners.update);
    collection.remove = injectTriggers(collection.remove, triggers.remove, listeners.remove);
    collection.findAndModify = injectTriggers(collection.findAndModify, triggers.findAndModify, listeners.findAndModify);

    return chainer;
};