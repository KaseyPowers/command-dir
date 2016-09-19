'use strict';

const _ = require('lodash');

const commands = require('./commands');
const utils = require('./utils');

module.exports = {
  runCommands(command, runExact) {
    // prepares each command and runs them in order
    var cmdArray = utils.checkArray(command, true);
    return Promise.all(_.map(cmdArray, cmd => {
      return this.prepCommand(runExact ? cmd : utils.splitStack(cmd));
    }))
    .then(preppedCommands => {
      return utils.runArray(preppedCommands);
    });
  },
  prepCommand(command) {
    // takes individual command as array, prepares a function to run all preParts
    var cmdArray = utils.checkArray(command);
    var preParts = [];
    var postParts = [];
    _.forEach(cmdArray, (cmd) => {
      preParts.push(utils.prepareFunction(this.runCommandPart, cmd, 'pre'));
      postParts.push(utils.prepareFunction(this.runCommandPart, cmd, 'post'));
    });
    var allParts = _.concat(
      preParts,
      utils.prepareFunction(this.runCommandPart, _.last(cmdArray)),
      postParts.reverse()
    );
    return utils.prepareFunction(utils.runArray, allParts);
  },
  runCommandPart(cmd, key) {
    return commands.getCommand(cmd)
    .then(cmdObj => {
      var toRun = cmdObj;
      if (key) {
        toRun = (cmdObj || {})[key];
      }
      return toRun;
    })
    .then(cmdToRun => {
      if (cmdToRun) {
        return Promise.resolve(utils.runMaybeFunction(cmdToRun.cmd));
      }
      return Promise.resolve();
    });
  }
}
