'use strict';
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const dirs = require('./dirs');

module.exports = {
    spaceSlash: /[\s\/]+/,
    split(input) {
      return _.compact((input || '').split(this.spaceSlash));
    },
    splitStack(input) {
      return _.reduce(this.split(input), (output, part) => {
        var next = (_.last(output) || '') + ' ' + part;
        return _.concat(output, _.trim(next));
      }, []);
    },
    runMaybeFunction(fn, ...args) {
      return _.isFunction(fn) ? fn.apply(this, ...args) : fn;
    },
    prepareFunction(fn, ...args) {
      return () => {
        return this.runMaybeFunction(fn, ...args);
        // return this.runMaybeFunction(fn, ...Array.prototype.slice.call(arguments, 1));
      }
    },
    runArray(functions) {
      return _.reduce(functions, (p, fn) => {
        return p.then(() => {
          return Promise.resolve(this.runMaybeFunction(fn));
        });
      }, Promise.resolve());
    },
    checkArray(input, compact) {
      var checked = _.concat([], input);
      return !!compact ? _.compact(checked) : checked;
    },
    makePathAbs(inputPath) {
      if (path.isAbsolute(inputPath)) {
        return inputPath;
      }
      return path.join(dirs.getContext(), inputPath);
    },
    isDirectory(filePath) {
      filePath = this.makePathAbs(filePath);
      return new Promise((resolve, reject) => {
        fs.lstat(filePath, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            resolve(stats.isDirectory());
          }
        });
        // fs.lstat(path.join(__dirname, 'test', 'build'), (err, stats) => {
        // try {
        //   var resolved = require.resolve(filePath);
        //   resolve(path.dirname(resolved) === _.trimEnd(filePath, '/'));
        // } catch(e) {
        //   reject(e);
        // }
      });
    }
}
