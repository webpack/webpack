/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var fs = require("fs");
var performantStat = require("./performantStat");

// http://nodejs.org/docs/v0.4.8/api/all.html#all_Together...


function resolve(context, identifier, options, type, callback) {
	function finalResult(err, absoluteFilename) {
		if(err) {
			callback(new Error("Module \"" + identifier + "\" not found in context \"" +
						context + "\"\n  " + err));
			return;
		}
		callback(null, absoluteFilename);
	}
	var identArray = split(identifier);
	var contextArray = split(context);
	while(options.alias[identArray[0]]) {
		var old = identArray[0];
		identArray[0] = options.alias[identArray[0]];
		identArray = split(path.join.apply(path, identArray));
		if(identArray[0] === old)
			break;
	}
	if(identArray[0] === "." || identArray[0] === ".." || identArray[0] === "" || identArray[0].match(/^[A-Z]:$/i)) {
		var pathname = identArray[0][0] === "." ? join(contextArray, identArray) : join(identArray, []);
		if(type === "context") {
			performantStat(pathname, function(err, stat) {
				if(err) {
					finalResult(err);
					return;
				}
				if(!stat.isDirectory()) {
					finalResult(new Error("Context \"" + identifier + "\" in not a directory"));
					return;
				}
				callback(null, pathname);
			});
		} else {
			loadAsFileOrDirectory(pathname, options, type, finalResult);
		}
	} else {
		loadNodeModules(contextArray, identArray, options, type, finalResult);
	}
}

function doResolve(context, identifier, options, type, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	if(!options)
		options = {};
	if(!options.extensions)
		options.extensions = ["", ".webpack.js", ".web.js", ".js"];
	if(!options.loaders)
		options.loaders = [];
	if(!options.postfixes)
		options.postfixes = ["", "-webpack", "-web"];
	if(!options.loaderExtensions)
		options.loaderExtensions = [".webpack-web-loader.js", ".webpack-loader.js", ".web-loader.js", ".loader.js", "", ".js"];
	if(!options.loaderPostfixes)
		options.loaderPostfixes = ["-webpack-web-loader", "-webpack-loader", "-web-loader", "-loader", ""];
	if(!options.paths)
		options.paths = [];
	if(!options.alias)
		options.alias = {};
	if(!options.postprocess)
		options.postprocess = {};
	if(!options.postprocess.normal)
		options.postprocess.normal = [];
	if(!options.postprocess.context)
		options.postprocess.context = [];
	var identifiers = identifier.replace(/^!|!$/g, "").replace(/!!/g, "!").split(/!/g);
	var resource = identifiers.pop();
	resolve(context, resource, options, type, function(err, resource) {
		if(err) return callback(err);
		if(identifier.indexOf("!") === -1) {
			for(var i = 0; i < options.loaders.length; i++) {
				var line = options.loaders[i];
				if(line.test.test(resource)) {
					Array.prototype.push.apply(identifiers, line.loader.split(/!/g));
					break;
				}
			}
		}
		var errors = [];
		var count = identifiers.length;
		function endOne() {
			count--;
			if(count === 0) {
				if(errors.length > 0) {
					callback(new Error(errors.join("\n")));
					return;
				}
				identifiers.push(resource);
				var intermediateResult = identifiers.join("!");
				var postprocessors = options.postprocess[type].slice(0);
				postprocessors.push(function(result) {
					callback(null, result);
				});
				(function next(err, result) {
					if(err)
						return callback(new Error("File \"" + intermediateResult + "\" is blocked by postprocessors: " + err));
					postprocessors.shift()(result, next);
				})(null, intermediateResult);
			}
		}
		if(count == 0) endOne(count++);
		identifiers.forEach(function(ident, index) {
			resolve(context, ident, options, "loader", function(err, filename) {
				if(err) {
					errors.push(err);
				} else {
					identifiers[index] = filename;
				}
				endOne()
			});
		});
	});
}

/**
 * context: absolute filename of current file
 * identifier: module to find
 * options:
 *   paths: array of lookup paths
 * callback: function(err, absoluteFilename)
 */
module.exports = function(context, identifier, options, callback) {
	return doResolve(context, identifier, options, "normal", callback);
}

module.exports.context = function(context, identifier, options, callback) {
	return doResolve(context, identifier, options, "context", callback);
}


function split(a) {
	return a.split(/[\/\\]/g);
}

function join(a, b) {
	var c = [];
	a.forEach(function(x) { c.push(x) });
	b.forEach(function(x) { c.push(x) });
	if(c[0] === "")
		c[0] = "/";
	return path.join.apply(path, c);
}

function loadAsFile(filename, options, type, callback) {
	var pos = -1, result = "NOT SET";
	var extensions = type === "loader" ? options.loaderExtensions : options.extensions;
	var tries = extensions.map(function(ext) {
		return filename + ext;
	});
	var count = tries.length;
	var results = tries.slice(0);
	tries.forEach(function(test, idx) {
		performantStat(test, function(err, stat) {
			results[idx] = (err || !stat || !stat.isFile()) ? null : test;
			count--;
			if(count === 0) {
				for(var i = 0; i < tries.length; i++) {
					if(results[i]) return callback(null, tries[i]);
				}
				return callback(new Error("Non of this files exists: " + tries.join(", ")));
			}
		});
	});
}

function loadAsDirectory(dirname, options, type, callback) {
	performantStat(dirname, function(err, stats) {
		if(err || !stats || !stats.isDirectory()) {
			return callback(new Error(dirname + " is not a directory"));
		}
		var packageJsonFile = join(split(dirname), ["package.json"]);
		performantStat(packageJsonFile, function(err, stats) {
			var mainModule = "index";
			if(!err && stats.isFile()) {
				fs.readFile(packageJsonFile, "utf-8", function(err, content) {
					if(err) {
						callback(err);
						return;
					}
					content = JSON.parse(content);
					if(content.webpackLoader && type === "loader")
						mainModule = content.webpackLoader;
					else if(content.webpack)
						mainModule = content.webpack;
					else if(content.browserify)
						mainModule = content.browserify;
					else if(content.main)
						mainModule = content.main;
					loadAsFile(join(split(dirname), [mainModule]), options, type, callback);
				});
			} else
				loadAsFile(join(split(dirname), [mainModule]), options, type, callback);
		});
	});
}

function loadAsFileOrDirectory(pathname, options, type, callback) {
	var result = null;
	var counter = 0;
	var error = null;
	var fastExit = false;
	loadAsFile(pathname, options, type, function(err, absoluteFilename) {
		if(err)
			error = err;
		else {
			fastExit = true;
			return callback(null, absoluteFilename);
		}
		if(counter++) bothDone();
	});
	loadAsDirectory(pathname, options, type, function(err, absoluteFilename) {
		if(err) {
			if(!error) error = err;
		} else {
			result = absoluteFilename;
		}
		if(counter++) bothDone();
	});
	function bothDone() {
		if(fastExit) return;
		if(result)
			callback(null, result);
		else
			callback(error);
	}
}

function loadNodeModules(context, identifier, options, type, callback) {
	var moduleName = identifier.shift();
	var postfixes = type === "loader" ? options.loaderPostfixes : options.postfixes;
	nodeModulesPaths(context, options, function(err, paths) {
		var dirs = [];
		paths.forEach(function(path) {
			postfixes.forEach(function(postfix) {
				dirs.push(join(split(path), [moduleName+postfix]));
			});
		});
		var count = dirs.length;
		var results = dirs.slice(0);
		var fastExit = false;
		dirs.forEach(function(dir, idx) {
			var pathname = join(split(dir), identifier);
			if(type === "context") {
				performantStat(pathname, function(err, stat) {
					results[idx] = (err || !stat.isDirectory()) ? null : pathname;
					endOne();
				});
			} else {
				loadAsFileOrDirectory(pathname, options, type, function(err, absoluteFilename) {
					results[idx] = err ? null : absoluteFilename;
					endOne();
				});
			}
		});
		function endOne(idx) {
			if(fastExit) return;
			count--;
			if(count === 0) {
				for(var i = 0; i < results.length; i++) {
					if(results[i])
						return callback(null, results[i]);
				}
				callback(new Error("non in any path of paths"));
			} else if(results[idx]) {
				for(var i = 0; i < idx; i++) {
					if(results[i])
						return;
				}
				fastExit = true;
				return callback(null, results[idx]);
			}
		}
	});
}

function nodeModulesPaths(context, options, callback) {
	var parts = context;
	var rootNodeModules = parts.indexOf("node_modules");
	var rootWebModules = parts.indexOf("web_modules");
	var root = 0;
	if(rootWebModules != -1 && rootNodeModules != -1)
		root = Math.min(rootWebModules, rootNodeModules)-1;
	else if(rootWebModules != -1 || rootNodeModules != -1)
		root = Math.max(rootWebModules, rootNodeModules)-1;
	var dirs = [];
	options.paths.forEach(function(path) { dirs.push(path) });
	for(var i = parts.length; i > root; i--) {
		if(parts[i-1] === "node_modules" || parts[i-1] === "web_modules")
			continue;
		var part = parts.slice(0, i);
		dirs.push(join(part, ["web_modules"]));
		dirs.push(join(part, ["node_modules"]));
	}
	var count = dirs.length;
	dirs.forEach(function(dir, idx) {
		performantStat(dir, function(err, stat) {
			if(err || !stat || !stat.isDirectory())
				dirs[idx] = null;
			endOne();
		});
	});
	function endOne() {
		count--;
		if(count === 0)
			callback(null, dirs.filter(function(item) { return item != null; }));
	}
}