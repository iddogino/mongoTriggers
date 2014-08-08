'use strict';

var clone = require('clone');
var noop = function () {};

var injectAfter = function (fn, injectFn) {
  return function () {
    var args = arguments;
    fn.apply(null, args);
    process.nextTick(function () {
      injectFn.apply(null, args);
    });
  };
};

exports = module.exports = function (collection) {
  var saveFilters = [],
      insertFilters = [],
      updateFilters = [],
      findFilters = [],
      documentFilters = [],
      listeners = { save: [], insert: [], update: [] },
      chainer, injectBeforeFilters, injectFindFilters;

  chainer = {
    save: function (filter) {
      saveFilters.push(filter);
      return chainer;
    },
    insert: function (filter) {
      insertFilters.push(filter);
      return chainer;
    },
    update: function (filter) {
      updateFilters.push(filter);
      return chainer;
    },
    find: function (filter) {
      findFilters.push(filter);
      return chainer;
    },
    document: function (filter) {
      documentFilters.push(filter);
      return chainer;
    },
    on: function (event, filter) {
      listeners[event].push(filter);
      return chainer;
    }
  };

  // Arguments:
  //   fn        : the original mongojs function
  //   filters   : the filters that should be run before `fn` is called
  //   listeners : the listeners that have subscribed to `fn` events
  //
  // Loop though all the `filters` and execute each with the same arguments as
  // would be passed to `fn` + an extra `next` callback.
  //
  // When the `filter` calls the `next` callback, the next `filter` in the
  // chain of `filters` is called, until finally there are no more `filters`,
  // in which case the original `fn` is finally called.
  injectBeforeFilters = function (fn, filters, listeners) {
    var stubArgs = [undefined, undefined, undefined];
    return function () {
      var index = 0,
          args = Array.prototype.slice.call(arguments),
          callback = noop,
          origArgs, next;

      if (typeof args[args.length-1] === 'function') {
        callback = args.pop();

        if (listeners.length > 0) {
          origArgs = clone(args);
          callback = injectAfter(callback, function () {
            var listenerArgs = Array.prototype.slice.call(arguments).concat(origArgs);
            listeners.forEach(function (listener) {
              listener.apply(collection, listenerArgs);
            });
          });
        }
      }

      next = function (err) {
        if (err) return callback(err);
        var filter = filters[index++];
        if (!filter) return fn.apply(collection, args.concat(callback));
        filter.apply(
          collection,
          args
            .concat(stubArgs)
            .slice(0, filter.length-1)
            .concat(next)
        );
      };
      next();
    };
  };

  injectFindFilters = function (fn) {
    var stubArgs = [undefined, undefined, undefined];
    var wrap = function (fn, cursor, args) {
      var projection = args.length >= 2 ? args[1] : {};
      return function (callback) {
        callback = callback || noop;

        // after filters
        var afterFilter = function (err, res) {
          if (err) return callback(err);
          var filterIndex = 0;
          var nextFilter = function (err) {
            if (err) return callback(err);
            var filter = documentFilters[filterIndex++];
            if (!filter) return callback(null, res);
            if (!Array.isArray(res)) return filter(res, projection, nextFilter);
            var docIndex = 0;
            var nextDoc = function (err) {
              if (err) return callback(err);
              var doc = res[docIndex++];
              if (!doc) return nextFilter();
              filter(doc, projection, nextDoc);
            };
            nextDoc();
          };
          nextFilter();
        };

        // before filters
        var index = 0;
        var next = function (err) {
          if (err) return callback(err);
          var filter = findFilters[index++];
          if (!filter) return fn.call(cursor, afterFilter);
          filter.apply(collection, args
              .concat(stubArgs)
              .slice(0, filter.length-1)
              .concat(next));
        };
        next();
      };
    };

    return function () {
      var args = Array.prototype.slice.call(arguments),
          callback, cursor;

      if (typeof args[args.length-1] === 'function')
        callback = args.pop();

      cursor = fn.apply(collection, args);
      cursor.next    = wrap(cursor.next, cursor, args);
      cursor.toArray = wrap(cursor.toArray, cursor, args);

      if (callback)
        return cursor.toArray(callback);
      else
        return cursor;
    };
  };

  collection.save   = injectBeforeFilters(collection.save, saveFilters, listeners.save);
  collection.insert = injectBeforeFilters(collection.insert, insertFilters, listeners.insert);
  collection.update = injectBeforeFilters(collection.update, updateFilters, listeners.update);
  collection.find   = injectFindFilters(collection.find);

  return chainer;
};