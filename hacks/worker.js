"use strict";

const loaderRunner = require("loader-runner");
const Parser = require("../lib/Parser");

module.exports = {
  runLoaders: function(input, callback) {
    return loaderRunner.runLoaders(input, function(err, result) {
      const source = result.result[0];

      if(Buffer.isBuffer(source)) {
        result.result[0] = source.toString();
      }
      callback(err, result);
    });
  },
  doParse: function(input, callback) {
    const parser = new Parser();
    input.pluginCalls.forEach((pluginArgs) => {
      const _args = [];
      Object.keys(pluginArgs).forEach((index) => {
        _args.push(pluginArgs[index]);
      });
      parser.plugin.apply(parser, _args);
    });

    parser.parse(input.source, input.parseOptions)
      .then(
        result => {
          callback(null, result);
        },
        reason => {
          callback(reason);
        }
      );
  },
};
