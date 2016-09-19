'use strict';

const _ = require('lodash');
const runner = require('./runner');
const dirs = require('./dirs');

function callRunner(command, newDirs, runExact) {
  if (newDirs) {
    dirs.addDirs(newDirs);
  }
  return runner.runCommands(command, runExact);
}

// Run and RunExact will add any dirs passed in to the global set
// dirs are merged in the order they are added, so most recently added override any other dirs already added
module.exports = _.assign({
  // clear out loaded directories (default is all) to be reloaded (will only effect run commands after this is run)
  refresh: loadedCommands.refresh,
  // run this command, with pre/post files
  run: _.partial(callRunner, _, _,false),
  // run exactly this command not the whole path's pre/post
  runExact: _.partial(callRunner, _, _,true)
}, dirs);
