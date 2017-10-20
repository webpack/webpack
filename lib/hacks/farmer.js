"use strict";

const workerFarm = require("worker-farm");
const pify = require("pify");
const os = require("os");
const tmp = require("tmp");
const fs = require("graceful-fs");
const createHashFromString = require("./hash");

/**
 * Hash map of where the parserOptions are stored.  We'll generate a hash from the parserOptions,
 * then use that hash in this key/value store.
 * key - The hash of the options, value - The location the actual options are stored.
 */
const parserOptionsMap = {};
tmp.setGracefulCleanup();

var farm;
var _buildModule;

function startFarm() {
  if(farm) return;
  if(farm) throw new Error("farm already started");
  farm = workerFarm({
    autoStart: true,
    maxConcurrentCallsPerWorker: Infinity,
    maxConcurrentWorkers: os.cpus().length - 1,
    maxRetries: 2, // Allow for a couple of transient errors.
  },
   require.resolve("./worker"),
   ["buildModule"]
  );
  _buildModule = pify(farm.buildModule);
}

function stopFarm() {
  workerFarm.end(farm);
  farm = undefined;
  _buildModule = undefined;
}

module.exports = {
  startFarm,
  stopFarm,
  buildModule(module, resolver, options, compilation, inputFS, callback) {
    if(!logStarted && console.profile) {
      console.profile(`build module ${logStarted}`);
    }
    module.cacheable = false; /* womp */
    const loaderContext = module.createLoaderContext(resolver, options, compilation, inputFS);
    /** gross, but none of this is serializable **/
    loaderContext.emitWarning = undefined;
    loaderContext.emitError = undefined;
    loaderContext.exec = undefined;
    loaderContext.resolve = undefined;
    loaderContext.resolveSync = undefined;
    loaderContext.emitFile = undefined;
    loaderContext.emitFileSync = undefined;
    loaderContext.options = undefined;
    loaderContext._module = undefined;
    loaderContext._compilation = undefined;
    loaderContext._compiler = undefined;
    loaderContext.fs = undefined;
    loaderContext.loadModule = undefined;
    loaderContext.readResource = undefined;


    /**
     * Parser options (plugins) are large, so we'll write them to disk and
     * pass a reference instead of passing the entire object to each worker
     * call. This will let workers cache an instance of a parser using these
     * options, and will cut down the overhead of ipc.
     */
    const serializedModule = module.serialize();
    const parserProps = serializedModule.parser;
    serializedModule.parser = undefined; // pull this of off the parser.
    const stringifiedParserProps = JSON.stringify(parserProps);
    const parserHash = createHashFromString(stringifiedParserProps);
    if(!parserOptionsMap[parserHash]) {
      const parserOptionsLocation = tmp.fileSync({ prefix: "parser-" }).name;
      fs.writeFileSync(parserOptionsLocation, stringifiedParserProps);
      parserOptionsMap[parserHash] = parserOptionsLocation;
    }

    const parserOptionsLocation = parserOptionsMap[parserHash];

    let opts = {
      moduleProps: serializedModule,
      loaderContext,
      // compilation, womp.
      compilation: {},
      options: Object.assign({}, options, {
        entry: undefined,
      }),
      timestamp: Date.now(),
      parser: {
        optionsLocation: parserOptionsLocation,
        optionsHash: parserHash,
      },
    };

    opts.loaderContext.fs = undefined;
    options.externals = undefined;
    options.plugins = undefined;

    // Calculate and log the general size of the object we're sending to workers.
    // opts = JSON.parse(JSON.stringify(opts));
    // console.log(isSerializable(opts));
    // Object.keys(opts).forEach(key => {
    //   const val = opts[key];
    //   console.log(`${key}: ${JSON.stringify(val).length} characters`);
    //   Object.keys(opts[key]).forEach(inner => {
    //     const val1 = opts[key][inner] || "";
    //     console.log(`  ${inner}: ${(JSON.stringify(val1) || "").length} characters`);
    //   });
    // });

    return _buildModule(opts)
    .then(
      result => {
        if(console.profile && !logStarted) {
          console.profileEnd(`build module ${logStarted}`);
          logStarted++;
        }
        module.hydrate(result);
        callback();
      },
      reason => {
        console.log(`Failed to buildModule ${reason}`);
        callback(reason);
      }
    );
  },
  useWorkers: true,
};
var logStarted = 0;
