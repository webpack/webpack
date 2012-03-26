/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var fs = require("fs");

// http://nodejs.org/docs/v0.4.8/api/all.html#all_Together...


function resolve(context, identifier, options, type, callback) {
	function finalResult(err, absoluteFilename) {
		if(err) {
			callback("Module \"" + identifier + "\" not found in context \"" +
						context + "\"\n  " + err);
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
		var pathname = identArray[0][0] === "." ? join(contextArray, identArray) : path.join.apply(path, identArray);
		loadAsFile(pathname, options, type, function(err, absoluteFilename) {
			if(err) {
				loadAsDirectory(pathname, options, type, finalResult);
				return;
			}
			callback(null, absoluteFilename);
		});
	} else {
		loadNodeModules(contextArray, identArray, options, type, finalResult);
	}
}

/**
 * context: absolute filename of current file
 * identifier: module to find
 * options:
 *   paths: array of lookup paths
 * callback: function(err, absoluteFilename)
 */
module.exports = function(context, identifier, options, callback) {
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
		options.loaderExtensions = [".webpack-web-loader.js", ".webpack-loader.js", ".web-loader.js", ".loader.js", ".js", ""];
	if(!options.loaderPostfixes)
		options.loaderPostfixes = ["-webpack-web-loader", "-webpack-loader", "-web-loader", "-loader", ""];
	if(!options.paths)
		options.paths = [];
	if(!options.alias)
		options.alias = {};
	var identifiers = identifier.split(/!/g);
	if(identifiers.length === 1) {
		var resource = identifiers.pop();
		for(var i = 0; i < options.loaders.length; i++) {
			var line = options.loaders[i];
			if(line.test.test(resource)) {
				identifiers.push(line.loader);
				break;
			}
		}
		identifiers.push(resource);
	}
	var errors = [];
	var count = identifiers.length;
	function endOne() {
		count--;
		if(count === 0) {
			if(errors.length > 0) {
				callback(errors.join("\n"));
				return;
			}
			callback(null, identifiers.join("!"));
		}
	}
	identifiers.forEach(function(ident, index) {
		resolve(context, ident, options, index === identifiers.length - 1 ? "normal" : "loader", function(err, filename) {
			if(err) {
				errors.push(err);
			} else {
				if(!filename) {
					throw new Error(JSON.stringify({identifiers: identifiers, from: ident, to: filename}));
				}

				identifiers[index] = filename;
			}
			endOne()
		});
	});
}

module.exports.context = function(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	if(!options)
		options = {};
	if(!options.paths)
		options.paths = [];
	function finalResult(err, absoluteFilename) {
		if(err) {
			callback("Context \"" + identifier + "\" not found in context \"" + context + "\"");
			return;
		}
		callback(null, absoluteFilename);
	}
	var identArray = identifier.split("/");
	var contextArray = split(context);
	if(identArray[0] === "." || identArray[0] === ".." || identArray[0] === "") {
		var pathname = join(contextArray, identArray);
		fs.stat(pathname, function(err, stat) {
			if(err) {
				finalResult(err);
				return;
			}
			if(!stat.isDirectory()) {
				finalResult("Context \"" + identifier + "\" in not a directory");
				return;
			}
			callback(null, pathname);
		});
	} else {
		loadNodeModulesAsContext(contextArray, identArray, options, finalResult);
	}
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
	function tryCb(err, stats) {
		if(err || !stats || !stats.isFile()) {
			pos++;
			if(pos >= extensions.length) {
				callback(err || "Isn't a file");
				return;
			}
			fs.stat(result = filename + extensions[pos], tryCb);
			return;
		}
		if(!result) throw new Error("no result");
		callback(null, result);
	}
	tryCb(true);
}

function loadAsDirectory(dirname, options, type, callback) {
	var packageJsonFile = join(split(dirname), ["package.json"]);
	fs.stat(packageJsonFile, function(err, stats) {
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
		function tryDir(dir) {
			var pathname = join(split(dir), identifier);
			loadAsFile(pathname, options, type, function(err, absoluteFilename) {
				if(err) {
					loadAsDirectory(pathname, options, type, function(err, absoluteFilename) {
						if(err) {
							if(dirs.length === 0) {
								callback("no module in any path of paths");
								return;
							}
							tryDir(dirs.shift());
							return;
						}
						callback(null, absoluteFilename);
					});
					return;
				}
				callback(null, absoluteFilename);
			});
		}
		tryDir(dirs.shift());
	});
}

function loadNodeModulesAsContext(context, identifier, options, callback) {
	nodeModulesPaths(context, options, function(err, dirs) {
		function tryDir(dir) {
			var pathname = join(split(dir), identifier);
			fs.stat(pathname, function(err, stat) {
				if(err || !stat.isDirectory()) {
					if(dirs.length === 0) {
						callback(true);
						return;
					}
					tryDir(dirs.shift());
					return;
				}
				callback(null, pathname);
			});
		}
		tryDir(dirs.shift());
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
	callback(null, dirs);
}