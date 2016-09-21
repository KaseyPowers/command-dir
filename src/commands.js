'use strict';
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const globby = require('globby');

const utils = require('./utils');
const loadedCommands = require('./loadedCommands');
const dirs = require('./dirs');

/*
command object:
{
cmd: the function
cmdName: the name, defaults to the file/dir name
description
pre: cmdObject
post: cmdObject
subCommands: {}
}
*/
let currentCommands = {};
let lastBuildDirs = {};

function buildCommands() {
  var toBuild = dirs.getDirFullPaths();
  if (!_.isEqual(toBuild, lastBuildDirs)) {
    return loadedCommands.readIn()
    .then(() => {
      currentCommands = _.reduce(toBuild, (output, value, key) => {
        output.subCommands[key] = _.reduceRight(value, (toMerge, cmdPath) => {
          var cmdObj = loadedCommands.findInStruct(cmdPath);
          if (cmdObj) {
            return mergeCommands(toMerge, buildCommandObj(cmdObj, key));
          }
          return toMerge;
        }, {});
        return output;
      }, {subCommands: {}});
    })
    .then(() => {
      lastBuildDirs = toBuild;
    });
  }
  return Promise.resolve();
}

function buildCommandObj(commandStruct, key) {
  var output = {
    cmd: commandStruct.cmd,
    description: commandStruct.description,
    pre: commandStruct.pre,
    post: commandStruct.post,
    subCommands: commandStruct.subCommands || {}
  };
  var allPre = {};
  var allPost = {};

  _.forEach(commandStruct.subPaths, (subStruct, subKey) => {
    if (subKey === 'index') {
      output = mergeCommands(output, buildCommandObj(subStruct, key));
    } else if (/^pre/.test(subKey)) {
      allPre[subKey] = buildCommandObj(subStruct, subKey);
    } else if (/^post/.test(subKey)) {
      allPost[subKey] = buildCommandObj(subStruct, subKey);
    } else {
      output.subCommands[subKey] = mergeCommands(output.subCommands[subKey],  buildCommandObj(subStruct, subKey));
    }
  });
  _.forEach(allPre, (preCmd, preKey) => {
    var trimmedKey = _.trimStart(preKey, 'pre');
    // key is just 'pre' or 'pre' +  assume its current command
    if (trimmedKey === '' || trimmedKey === key) {
      output.pre = mergeCommands(output.pre, preCmd);
    } else if (_.includes(_.keys(output.subCommands), trimmedKey)) {
      // key is 'pre' + subCommand, add it there
      output.subCommands[trimmedKey].pre = mergeCommands(output.subCommands[trimmedKey].pre, preCmd);
    } else {
      output.subCommands[preKey] = mergeCommands(output.subCommands[preKey], preCmd);
    }
  });
  _.forEach(allPost, (postCmd, postKey) => {
    var trimmedKey = _.trimStart(postKey, 'post');
    // key is just 'post' or 'post' +  assume its current command
    if (trimmedKey === '' || trimmedKey === key) {
      output.post = mergeCommands(output.post, postCmd);
    } else if (_.includes(_.keys(output.subCommands, trimmedKey))) {
      // key is 'post' + subCommand, add it there
      output.subCommands[trimmedKey].post = mergeCommands(output.subCommands[trimmedKey].post, postCmd);
    } else {
      output.subCommands[postKey] = mergeCommands(output.subCommands[postKey], postCmd);
    }
  });
  return output;
}

function mergeCommands(a, b) {
  if (!a || !b) {
    return a || b;
  }
  a = a || {};
  b = b || {};
  var output = {
    cmd: b.cmd || a.cmd,
    description: b.description || a.description,
    pre: mergeCommands(a.pre, b.pre),
    post: mergeCommands(a.post, b.post),
    subCommands: {}
  };
  _.forEach(a.subCommands, (value, key) => {
    output.subCommands[key] = mergeCommands(output.subCommands[key], value);
  });
  _.forEach(b.subCommands, (value, key) => {
    output.subCommands[key] = mergeCommands(output.subCommands[key], value);
  });
  return output;
}

module.exports = {
  getCommand(path) {
    return buildCommands()
    .then(() => {
      var splitPath = utils.split(path);
      return _.reduce(splitPath, (result, part) => {
        if (part === 'index') {
          return result;
        }
        if (result) {
          return _.result(result, ['subCommands', part]);
        }
      }, currentCommands);
    });
  }
};
