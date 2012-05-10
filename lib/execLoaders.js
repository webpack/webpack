/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var resolve = require("./resolve");
var fs = require("fs");
var path = require("path");

module.exports = function(request, loaders, filenames, contents, options, callback) {
	if(loaders.length === 0)
		callback(null, contents[0].toString("utf-8"));
	else {
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
		function nextLoader() {
			var args = Array.prototype.slice.apply(arguments);
			var err = args.shift();
			if(err) {
				callback(err);
				return;
			}
			if(loaderFunctions.length > 0) {
				var async = false;
				var done = false;
				try {
					var context = {
						request: request,
						filenames: filenames,
						exec: function(code, filename) {
							var Module = require("module");
							var m = new Module("exec in " + request, module);
							m.filename = filenames[0];
							m._compile(code, filename);
							return m.exports;
						},
						resolve: function(context, path, cb) {
							resolve(context, "!"+path, options.resolve, cb);
						},
						async: function() {
							async = true;
							return context.callback;
						},
						callback: function(err) {
							async = true;
							if(done) {
								if(err.stack) console.error(err.stack);
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
					if(options.loader) for(var key in options.loader) 
						context[key] = options.loader[key];
					var params = [];
					args.forEach(function(arg) {
						if(arg instanceof Buffer)
							params.push(arg.toString("utf-8"));
						else
							params.push(arg);
					});
					var retVal = loaderFunctions.pop().apply(context, params);
					if(!async) {
						done = true;
						if(retVal instanceof Buffer)
							retVal = retVal;
						else if(typeof retVal === "string")
							retVal = new Buffer(retVal, "utf-8");
						nextLoader(retVal === undefined ? new Error("loader did not return a value") : null, retVal);
					}
				} catch(e) {
					if(!done) {
						done = true;
						callback("Loader throwed exeception: " + (e.stack ? e.stack : e));
					} else {
						if(e.stack) console.error(e.stack);
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