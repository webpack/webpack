/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var resolve = require("enhanced-resolve");
var fs = require("fs");
var path = require("path");

/**
 * execLoaders
 * @param context {string}			the context from which this request is coming
 * @param request {string}			the compile request string
 * @param loaders {string[]}		the absolute filenames of the loaders
 * @param filenames {string[]}		the filenames of "contents"
 * @param contents {Buffer[]}		read contents
 * @param cacheEntry {CacheEntry}	the cache entry to add dependencies
 * @param options {object}			the options of the module system
 * @param callback {function}		(err, arrayOfResultBuffers, allowCaching)
 */
module.exports = function(context, request, loaders, filenames, contents, cacheEntry, options, callback) {
	var loaderFunctions, cacheable = true;
	if(loaders.length === 0) {
		// if no loaders are used, the file content is the resulting code
		callback(null, contents, true);
	} else {
		// try to load all loaders
		loaderFunctions = [];
		try {
			loaders.forEach(function(name) {
				var loaderFilename = require.resolve(name);
				options.events.emit("loader", loaderFilename);

				var loader = require(loaderFilename);

				if(loader.separable) {
					// require loader in fresh context
					var oldCache = {};
					for(var entry in require.cache) {
						oldCache[entry] = require.cache[entry];
						delete require.cache[entry];
					}
					loader = require(loaderFilename);
					for(var entry in oldCache) {
						require.cache[entry] = oldCache[entry];
					}
				} else {
					options.events.emit("static-dependency", loaderFilename);
				}

				loaderFunctions.push(loader);
			});
		} catch(e) {
			callback(e);
			return;
		}
		// iterate over the loaders, asynchron
		contents.unshift(null);
		nextLoader.apply(null, contents);
	}
	function nextLoader(/* err, paramBuffer1, paramBuffer2, ...*/) {
		var args = Array.prototype.slice.apply(arguments);
		var err = args.shift();
		if(err) {
			// a loader emitted an error
			callback(err);
			return;
		}
		// if loaders are remaining
		if(loaderFunctions.length > 0) {
			var loaderCacheable = false;
			var async = false;
			var done = false;
			try {
				// prepare the loader "this" context
				// see "Loader Specification" in wiki
				var loaderContext = {
					context: context,
					request: request,
					filenames: filenames,
					exec: function(code, filename) {
						var Module = require("module");
						var m = new Module("exec in " + request, module);
						m.filename = filenames[0];
						m.paths = Module._nodeModulePaths(path.dirname(filenames[0]));
						m._compile(code, filename);
						return m.exports;
					},
					resolve: function(context, path, cb) {
						resolve(context, "!"+path, options.resolve, cb);
					},
					cacheable: function(value) {
						if(value === undefined) value = true;
						loaderCacheable = value;
					},
					dependency: function(filename) {
						options.events.emit("dependency", filename);
						if(cacheEntry)
							cacheEntry.add(filename);
					},
					clearDependencies: function(filename) {
						if(cacheEntry)
							cacheEntry.clear();
					},
					async: function() {
						async = true;
						return loaderContext.callback;
					},
					callback: function(err) {
						async = true;
						if(done) {
							// loader is already "done", so we cannot use the callback function
							// for better debugging we print the error on the console
							if(err && err.stack) console.error(err.stack);
							else if(err) console.error(err);
							else console.error(new Error("loader returned multiple times").stack);
							return;
						}
						done = true;
						contents = [err];
						for(var i = 1; i < arguments.length; i++) {
							var arg = arguments[i];
							if(arg instanceof Buffer)
								contents.push(arg);
							else if(typeof arg === "string")
								contents.push(new Buffer(arg, "utf-8"));
							else
								contents.push(arg);
						}
						loaderFinished.apply(null, arguments);
					},
					web: true,
					debug: options.debug,
					minimize: options.minimize,
					values: undefined,
					options: options,
					buffers: args
				};

				// add additional loader context params or functions
				if(options.loader) for(var key in options.loader)
					loaderContext[key] = options.loader[key];

				// convert all parameters to strings if they are Buffers
				var params = [];
				args.forEach(function(arg) {
					if(arg instanceof Buffer)
						params.push(arg.toString("utf-8"));
					else
						params.push(arg);
				});

				// exec to loader
				var retVal = loaderFunctions.pop().apply(loaderContext, params);

				// if it isn't asynchron, use the return value
				if(!async) {
					done = true;
					if(retVal instanceof Buffer)
						retVal = retVal;
					else if(typeof retVal === "string")
						retVal = new Buffer(retVal, "utf-8");
					loaderFinished(retVal === undefined ? new Error("loader did not return a value") : null, retVal);
				}

				function loaderFinished() {
					if(!loaderCacheable)
						cacheable = false;

					nextLoader.apply(null, arguments);
				}
			} catch(e) {
				// ups. loader throwed an exeception
				if(!done) {
					done = true;
					callback(new Error("Loader throwed exeception: " + (typeof e === "object" && e.stack ? e.stack : e)));
				} else {
					// loader is already "done", so we cannot use the callback function
					// for better debugging we print the error on the console
					if(typeof e === "object" && e.stack) console.error(e.stack);
					else console.error(e);
				}
				return;
			}
		} else {
			callback(null, args, cacheable);
		}
	}
}