/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var resolve = require("./resolve");
var fs = require("fs");
var path = require("path");

/**
 * execLoaders
 * @param context {string}			the context from which this request is coming
 * @param request {string}			the compile request string
 * @param loaders {string[]}		the absolute filenames of the loaders
 * @param filenames {string[]}		the filenames of "contents"
 * @param contents {Buffer[]}		read contents
 * @param options {object}			the options of the module system
 * @param callback {function}		(err, resultingJavascriptCode)
 */
module.exports = function(context, request, loaders, filenames, contents, options, callback) {
	if(loaders.length === 0)
		// if no loaders are used, the file content is the resulting code
		callback(null, contents[0].toString("utf-8"));
	else {
		// try to load all loaders
		// TODO this doesn't reload the loader if it has changed
		// TODO to support watch mode better, fix that
		var loaderFunctions = [];
		try {
			loaders.forEach(function(name) {
				var loader = require(name);
				loaderFunctions.push(loader);
			});
		} catch(e) {
			callback(e);
			return;
		}
		// iterate over the loaders, asynchron
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
							for(var i = 0; i < arguments.length; i++) {
								var arg = arguments[i];
								if(arg instanceof Buffer)
									contents.push(arg);
								else if(typeof arg === "string")
									contents.push(new Buffer(arg, "utf-8"));
							}
							nextLoader.apply(null, arguments);
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
						nextLoader(retVal === undefined ? new Error("loader did not return a value") : null, retVal);
					}
				} catch(e) {
					// ups. loader throwed an exeception
					if(!done) {
						done = true;
						callback("Loader throwed exeception: " + (typeof e === "object" && e.stack ? e.stack : e));
					} else {
						// loader is already "done", so we cannot use the callback function
						// for better debugging we print the error on the console
						if(typeof e === "object" && e.stack) console.error(e.stack);
						else console.error(e);
					}
					return;
				}
			} else {
				callback(null, args[0].toString("utf-8"));
			}
		}
		contents.unshift(null);
		nextLoader.apply(null, contents);
	}

}