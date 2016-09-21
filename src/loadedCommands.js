'use strict';
const fs = require('fs');
const path = require('path');
const pathExists = require('path-exists');
const _ = require('lodash');
const globby = require('globby');

const utils = require('./utils');
const dirs = require('./dirs');

/*
command obj for file structure
{
  cmd: function
  description
  ignore: if this is true when reading in the file, it will not be added to the structure
  subPaths: { strucutre objects, keyed by filename }
}
*/

// structure representing intire file structure loaded in so far
const loadedStruct = {};
function addToStruct(obj, fullPath) {
  var pathParts = utils.split(utils.makePathAbs(fullPath));
  var toAdd = _.reduce(pathParts, (result, pathPart) => {
    result.subPaths = result.subPaths || {};
    result.subPaths[pathPart] = result.subPaths[pathPart] || {};
    return result.subPaths[pathPart];
  }, loadedStruct);
  toAdd = _.merge(toAdd, obj);
}
function isLoaded(input) {
  var thisStruct = findInStruct(input);
  return !!thisStruct && (!inputPath.endsWith('/') || !!thisStruct.subPaths);
}
function findInStruct(input) {
  var splitPath = utils.split(utils.makePathAbs(input));
  return _.reduce(splitPath, (result, pathPart) => {
    return _.get(result, ['subPaths', pathPart]);
  }, loadedStruct);
}

// store paths to read
let toRead = [];
// add this to the read paths
function addToRead(dirPaths) {
  var toCheck = _.filter(
    utils.checkArray(dirPaths, true),
    (checkPath) => {
      return !_.includes(toRead, checkPath) && !isLoaded(checkPath);
    }
  );
  toRead = _.concat(toRead, toCheck);
}
let readInPromise;
// set and return the read in promise
function startReadIn() {
  readInPromise = Promise.resolve()
  .then(() => {
    // gets the next path and read it in
    function readNext() {
      var nextRead = _.first(toRead);
      // if there is antything left to read
      if (nextRead) {
        return _readIn(nextRead)
        .then(() => {
          toRead = _.tail(toRead);
          // after finishing, try to read in the next path
          return readNext();
        });
      }
      return Promise.resolve();
    }
    return readNext();
  }).
  then(() => {
    readInPromise = undefined;
  })
}

function _readIn(input) {
  var filePath = utils.makePathAbs(input);
  if (!isLoaded(filePath) && pathExists.sync(filePath)) {
      return utils.isDirectory(filePath)
      .then(isDir => {
        return (isDir ? readDir : readFile)(filePath);
      })
      .catch(err => {
        console.log('error reading: ', filePath);
        console.log(err.stack || err);
      });
  }
  return Promise.resolve();
}

function readDir(dirPath) {
  return globby(['*.js', '*/'], { cwd: utils.makePathAbs(dirPath)})
  .then(allPaths => {
    return utils.runArray(_.map(allPaths, subPath => {
      var fullPath = path.join(dirPath, subPath);
      return utils.prepareFunction(_readIn(fullPath));
    }));
  });
}

function readFile(filePath) {
  filePath = utils.makePathAbs(filePath);
  var requirePath = path.relative(__dirname, filePath);

  var thisFile = require(filePath);
  if (thisFile && !thisFile.ignore) {
    buildAndAdd(thisFile, filePath);
      // addToStruct(buildCommand(cmd), filePath);
  }
}
function buildAndAdd(cmd, filePath) {
  filePath = utils.makePathAbs(filePath);
  var trimExt = _.trimEnd(filePath, path.extname(filePath));
  var cmdKey = path.basename(trimExt);
  var cmdObj = buildCommand(cmd, cmdKey);
  addToStruct(cmdObj, trimExt);
}

function buildCommand(cmd, cmdKey) {
  cmdKey = cmdKey || '';
  var output = {
    description: cmd.description,
    hidden: cmd.hidden,
    subCommands: {}
  };
  if (cmd.subCommands) {
    _.forEach(cmd.subCommands, (value, key) => {
      output.subCommands[key] = buildCommand(value, key);
    });
  }
  if (!_.isUndefined(cmd.cmd)) {
    output.cmd = cmd.cmd;
  } else if (_.isFunction(cmd)) {
    output.cmd = cmd;
  }
  _.forEach(cmd, (value, key) => {
    if (_.includes(['pre', 'pre'+cmdKey], key)) {
      output.pre = buildCommand(value);
    }
    if (_.includes(['post', 'post'+cmdKey], key)) {
      output.post = buildCommand(value);
    }
  });
  return output;
}

module.exports = {
  refresh(input) {
    var pathsToDelete = utils.checkArray(input || '/');
    _.forEach(pathsToDelete, (dir) => {
      var thisObj = findInStruct(path.dirname(dir));
      var thisKey = path.basename(dir, path.extname(dir));
      if (thisObj) {
        _.unset(thisObj, thisKey);
      }
    });
  },
  readIn() {
    addToRead(dirs.getAllDirPaths());
    if (!readInPromise) {
      startReadIn();
    }
    return readInPromise;
  },
  findInStruct
};
