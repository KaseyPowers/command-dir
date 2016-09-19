'use strict';

const path = require('path');

const _ = require('lodash');


var _dirs = {};
var _context = process.cwd();

module.exports = {
  // add these dirs to the global set, newest added will be merged over previous
  addDirs(dirs) {
    _.forEach( (_.concat([], dirs)), (dir) => {
      var thisPath = _.isString(dir) ? dir : dir.path;
      var thisBase = (_.isString(dir) || _.isUndefined(dir.base)) ? path.basename(thisPath) : dir.base;
      _dirs[thisBase] = _.uniq(_.concat(thisPath, (_dirs[thisBase] || [])));
    });
  },
  // get the dir structure with full paths
  getDirFullPaths() {
    return _.reduce(_dirs, (output, paths, base) => {
      return _.set(output, base,  _.uniq(_.map(paths, dirPath => {
        return path.isAbsolute(dirPath) ? dirPath : path.join(_context, dirPath);
      })));
    }, {});
  },
  // get an array of all the paths in dirs
  getAllDirPaths() {
    var dirPaths = this.getDirFullPaths();
    return _.reduce(dirPaths, (output, value) => {
      return _.uniq(_.concat(output, value));
    }, []);
  },
  getContext() {
    return _context;
  },
  setContext(input) {
    if (path.isAbsolute(context)) {
      _context = context;
    } else {
      throw new Error('context must be an absolute path');
    }
  }
}
