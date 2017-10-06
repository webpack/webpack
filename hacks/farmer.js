"use strict";

const workerFarm = require("worker-farm");
const pify = require("pify");
const Tapable = require("tapable");
const os = require("os");

var farm;
var _runLoaders;
var _doParse;

function startFarm() {
  if(farm) throw new Error("farm already started");
  farm = workerFarm({
    autoStart: true,
    maxConcurrentCallsPerWorker: 1,
    maxConcurrentWorkers: os.cpus().length - 1,
    maxRetries: 2, // Allow for a couple of transient errors.
  },
   require.resolve("./worker"),
   ["runLoaders", "doParse"]
  );
  _runLoaders = pify(farm.runLoaders);
  _doParse = pify(farm.doParse);
}

function stopFarm() {
  workerFarm.end(farm);
  farm = undefined;
  _runLoaders = undefined;
  _doParse = undefined;
}

module.exports = {
  startFarm,
  stopFarm,
  runLoaders: function runLoaders(options, callback) {
    if(!_runLoaders) throw new Error("whoa there, don't have a farm running!");

    /**
     * Ensure that options is serializable since we're sending to a child
     * worker.
     */
    delete options.context.emitWarning;
    delete options.context.emitError;
    delete options.context.exec;
    delete options.context.resolve;
    delete options.context.resolveSync;
    delete options.context.emitFile;
    delete options.context.emitFileSync;
    delete options.context.options;
    delete options.context._module;
    delete options.context._compilation;
    delete options.context._compiler;
    delete options.context.fs;
    delete options.context.loadModule;
    delete options.readResource;

    _runLoaders(options)
    .then(
      result => {
        callback(null, result);
      },
      reason => {
        callback(reason);
      }
    );
  },
  createParserReference() {
    /**
     * Hacky way to pass around an instance of "Parser" without changing a
     * bunch more stuff.
     */
    class LeanParser extends Tapable {
      parse(source, parseOptions) {
        if(!_doParse) throw new Error("whoa there, don't have a farm running!");
        /**
         * Without deleting these the worker will not receive a message.
         * Probably because they are not serializable, or they are too
         * large.
         */
        delete parseOptions.current;
        delete parseOptions.module;
        delete parseOptions.compilation;
        const input = {
          source,
          parseOptions,
          pluginCalls: this._leanPlugins,
        };
        return _doParse(input);
      }
    }

    LeanParser.prototype.plugin = function plugin(hook, potentialDef) {
      if(!this._leanPlugins) this._leanPlugins = [];
      this._leanPlugins.push(arguments);
    };

    return new LeanParser();
  }
};
