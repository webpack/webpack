/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var buildDeps = require("./buildDeps");
var writeChunk = require("./writeChunk");
var Cache = require("./Cache");
var path = require("path");
var fs = require("fs");
var fileExists = fs.exists || path.exists;

var HASH_REGEXP = /\[hash\]/i;

/*
	webpack(context, moduleName, options, callback);
	webpack(context, moduleName, callback);
	webpack(absoluteModulePath, options, callback);
	webpack(absoluteModulePath, callback);

	callback: function(err, source / stats)
	  source if options.output is not set
	  else stats json

	options:
	- outputJsonpFunction
	   JSONP function used to load chunks
	- publicPrefix
	   Path from where chunks are loaded
	- outputDirectory
	   write files to this directory (absolute path)
	- output
	   write first chunk to this file
	- outputPostfix
	   write chunks to files named chunkId plus outputPostfix
	- libary
	   exports of input file are stored in this variable
	- watch
	   recompile on file change
	- watchDelay
	   delay before recompile after the last file change
	- minimize
	   minimize outputs with uglify-js
	- includeFilenames
	   add absolute filenames of input files as comments
	- resolve.alias (object)
	   replace a module. ex {"old-module": "new-module"}
	- resolve.extensions (object)
	   possible extensions for files
	- resolve.paths (array)
	   search paths
	- resolve.loaders (array)
	   extension to loader mappings
	   {test: /\.extension$/, loader: "myloader"}
	   loads files that matches the RegExp to the loader if no other loader set
	- parse.overwrites (object)
	   free module varables which are replaced with a module
	   ex. { "$": "jquery" }
*/
module.exports = function(context, moduleName, options, callback) {
	// Support multiple call signitures
	if(typeof moduleName === "object") {
		callback = options;
		options = moduleName;
		context = context.split("!");
		var file = context.pop();
		context.push("./" + path.basename(file));
		moduleName = context.join("!");
		context = path.dirname(file);
	}
	if(typeof moduleName === "function") {
		callback = moduleName;
		options = {};
		context = context.split("!");
		var file = context.pop();
		context.push("./" + path.basename(file));
		moduleName = context.join("!");
		context = path.dirname(file);
	}
	if(!callback) {
		callback = options;
		options = {};
	}

	// Defaults
	if(!options.outputJsonpFunction)
		options.outputJsonpFunction = "webpackJsonp" + (options.libary  || "");
	options.scriptSrcPrefix = options.scriptSrcPrefix || ""; // DEPRECATED
	options.publicPrefix = options.publicPrefix || options.scriptSrcPrefix

	options.context = options.context || context;

	options.emitFile = options.emitFile || function(filename, content, toFront) {
		options.internal.fileWrites[toFront?"unshift":"push"]([path.join(options.outputDirectory, filename), content]);
	}

	if(options.output) {
		if(!options.outputDirectory) {
			options.outputDirectory = path.dirname(options.output);
			options.output = path.basename(options.output);
		}
		if(!options.outputPostfix) {
			options.outputPostfix = "." + options.output;
		}
	} // else DEPRECATED

	options.parse = options.parse || {};
	options.parse.overwrites = options.parse.overwrites || {};
	options.parse.overwrites.process = options.parse.overwrites.process || ("__webpack_process");
	options.parse.overwrites.module = options.parse.overwrites.module || ("__webpack_module+(module)");
	options.parse.overwrites.console = options.parse.overwrites.console || ("__webpack_console");
	options.parse.overwrites.global = options.parse.overwrites.global || ("__webpack_global");
	options.parse.overwrites.Buffer = options.parse.overwrites.Buffer || ("buffer+.Buffer");
	options.parse.overwrites["__dirname"] = options.parse.overwrites["__dirname"] || ("__webpack_dirname");
	options.parse.overwrites["__filename"] = options.parse.overwrites["__filename"] || ("__webpack_filename");

	options.resolve = options.resolve || {};
	options.resolve.paths = options.resolve.paths || [];
	options.resolve.paths.push(path.join(path.dirname(__dirname), "buildin"));
	options.resolve.paths.push(path.join(path.dirname(__dirname), "buildin", "web_modules"));
	options.resolve.paths.push(path.join(path.dirname(__dirname), "buildin", "node_modules"));
	options.resolve.paths.push(path.join(path.dirname(__dirname), "node_modules"));
	options.resolve.alias = options.resolve.alias || {};
	options.resolve.loaders = options.resolve.loaders || [];
	options.resolve.loaders.push({test: /\.coffee$/, loader: "coffee"});
	options.resolve.loaders.push({test: /\.json$/, loader: "json"});
	options.resolve.loaders.push({test: /\.jade$/, loader: "jade"});
	options.resolve.loaders.push({test: /\.css$/, loader: "style!css"});
	options.resolve.loaders.push({test: /\.less$/, loader: "style!css!val/cacheable!less"});
	if(!options.resolve.extensions)
		options.resolve.extensions = ["", ".webpack.js", ".web.js", ".js"];
	if(!options.resolve.postfixes)
		options.resolve.postfixes = ["", "-webpack", "-web"];
	if(!options.resolve.loaderExtensions)
		options.resolve.loaderExtensions = [".webpack-web-loader.js", ".webpack-loader.js", ".web-loader.js", ".loader.js", "", ".js"];
	if(!options.resolve.loaderPostfixes)
		options.resolve.loaderPostfixes = ["-webpack-web-loader", "-webpack-loader", "-web-loader", "-loader", ""];
	if(!options.resolve.modulesDirectorys)
		options.resolve.modulesDirectorys = ["web_modules", "jam", "node_modules"];
	if(!options.resolve.alias)
		options.resolve.alias = {};
	if(!options.resolve.postprocess)
		options.resolve.postprocess = {};
	if(!options.resolve.postprocess.normal)
		options.resolve.postprocess.normal = [];
	if(!options.resolve.postprocess.context)
		options.resolve.postprocess.context = [];

	options.preLoaders = options.preLoaders || [];
	options.postLoaders = options.postLoaders || [];

	options.loader = options.loader || {};
	options.loader.emitFile = options.loader.emitFile || options.emitFile;
	options.loader.emitSubStats = options.loader.emitSubStats || function(stats) {
		options.internal.subStats.push(stats);
	}

	// Create a options.events as EventEmitter
	if(!options.events) options.events = new (require("events").EventEmitter)();

	// Register listeners to support watch mode
	if(options.watch) {
		var fs = require("fs");
		var watchers = [];
		var timeout;
		var isRunning = true;
		var isWaiting = false;
		var runAgain = false;

		// Start the timeout again
		function startAgain() {
			if(!isWaiting)
				options.events.emit("bundle-invalid");
			isWaiting = true;
			if(timeout)
				clearTimeout(timeout);
			timeout = setTimeout(function() {
				watchers.forEach(function(watcher) {
					watcher.close();
				});
				watchers.length = 0;

				runAgain = false;
				isRunning = true;
				isWaiting = false;

				// compile
				webpack(context, moduleName, options, callback);
			}, options.watchDelay || 200);
		}

		// on change
		function change() {
			if(isRunning)
				runAgain = true;
			else
				startAgain()

		}

		// on before a module is read
		options.events.on("module", function(module, filename) {
			if(!filename) return;
			watchers.push(fs.watch(filename, function() {
				change();
			}));
		});

		// on before a loader dependency is read
		options.events.on("dependency", function(filename) {
			if(!filename) return;
			watchers.push(fs.watch(filename, function() {
				change();
			}));
		});

		// on before a context is enumerated
		options.events.on("context", function(module, dirname) {
			if(!dirname) return;
			watchers.push(fs.watch(dirname, function() {
				change();
			}));
		});

		// on before a loader is read
		options.events.on("loader", function(filename) {
			if(!filename) return;
			watchers.push(fs.watch(filename, function() {
				change();
			}));
		});

		// on user defines the bundle as invalid
		options.events.on("invalid", function() {
			change();
		});

		// on bundle finished compiling
		options.events.on("bundle", function(stats) {
			isRunning = false;
			if(runAgain)
				startAgain();
		});

		if(!options.cache)
			options.cache = new Cache(options.cacheOptions);
	}

	// compile
	return webpack(context, moduleName, options, callback);
}
function webpack(context, moduleName, options, callback) {
	var startTime = new Date();

	options.internal = {};

	// all writes to files
	// items: [filename, content]
	var fileWrites = [], subStats = [];
	options.internal.fileWrites = fileWrites;
	options.internal.subStats = subStats;

	// Some status info
	if(!options.noWrite) options.events.emit("task", "create ouput directory");
	options.events.emit("task", "prepare chunks");
	options.events.emit("task", "statistics");

	// build up the dependency tree
	buildDeps(context, moduleName, options, function(err, depTree) {
		if(err) {
			callback(err);
			return;
		}
		var buffer = [];
		if(options.output) { // if options.output set, we write to files

			// collect which module is in which file
			var fileModulesMap = {};

			// collect which chunks exists
			var chunksCount = 0;

			// all ids of the chunks, in desc order
			var chunkIds = Object.keys(depTree.chunks);
			chunkIds.sort(function(a,b) {
				if(typeof depTree.chunks[b].realId !== "number") return 1;
				if(typeof depTree.chunks[a].realId !== "number") return -1;
				return depTree.chunks[b].realId - depTree.chunks[a].realId;
			});

			// the template used
			var template = getTemplate(options, {chunks: chunkIds.length > 1});

			// hash as crypto.Hash instance
			// for compution
			var hash;
			try {
				hash = new (require("crypto").Hash)("md5");
				hash.update(JSON.stringify(options.libary || ""));
				hash.update(JSON.stringify(options.outputPostfix));
				hash.update(JSON.stringify(options.outputJsonpFunction));
				hash.update(JSON.stringify(options.publicPrefix));
				hash.update(template);
				hash.update("1");
			} catch(e) {
				// if this didn't work
				// we do not use a hash
				hash = null;
			}

			// for each chunk
			for(var i = 0; i < chunkIds.length; i++) {
				var chunkId = chunkIds[i];
				var chunk = depTree.chunks[chunkId];

				// check is chunk is empty or a duplicate
				if(chunk.empty) return;
				if(chunk.equals !== undefined) return;
				chunksCount++;

				// build filename
				var filename = chunk.filename = chunk.realId === 0 ? options.output : chunk.realId + options.outputPostfix;

				// get content of chunk
				var content = writeChunk(depTree, chunk, options);
				if(hash) hash.update(content);
				buffer = [];
				if(chunk.realId === 0) { // initial chunk
					if(hash)
						hash = hash.digest("hex");
					else
						hash = "";

					// if it should be a libary, we prepend a variable name
					if(options.libary) {
						buffer.push("/******/var ");
						buffer.push(options.libary);
						buffer.push("=\n");
					}

					// write the template
					buffer.push(template);

					// write extra info into object
					buffer.push("/******/({");
					if(chunkIds.length > 1) {
						buffer.push("a:");
						buffer.push(JSON.stringify(options.outputPostfix.replace(HASH_REGEXP, hash)));
						buffer.push(",b:");
						buffer.push(JSON.stringify(options.outputJsonpFunction));
						buffer.push(",");
					}
					buffer.push("c:");
					buffer.push(JSON.stringify(options.publicPrefix.replace(HASH_REGEXP, hash)));
					buffer.push(",\n");
				} else { // lazy loaded chunk
					// write only jsonp function and chunk id as function call
					buffer.push("/******/");
					buffer.push(options.outputJsonpFunction);
					buffer.push("(");
					buffer.push(chunk.realId);
					buffer.push(", {\n");
				}
				// write content of chunk
				buffer.push(content);

				// and close object
				buffer.push("/******/})");

				// convert buffer to string
				buffer = buffer.join("");

				// minimize if wished
				try {
					if(options.minimize) buffer = uglify(buffer, path.join(options.outputDirectory, filename));
				} catch(e) {
					return callback(e);
				}

				// push it as "file write"
				options.emitFile(filename, buffer, true);
			}
			options.events.emit("task-end", "prepare chunks");

			if(options.noWrite) return writingFinished();

			options.events.emit("start-writing", hash);

			// recursive create dir
			function createDir(dir, callback) {
				fileExists(dir, function(exists) {
					if(exists)
						callback();
					else {
						fs.mkdir(dir, function(err) {
							if(err) {
								var parentDir = path.join(dir, "..");
								if(parentDir == dir)
									return callback(err);
								createDir(parentDir, function(err) {
									if(err) return callback(err);
									fs.mkdir(dir, function(err) {
										if(err) return callback(err);
										callback();
									});
								});
								return;
							}
							callback();
						});
					}
				});
			}

			// create output directory
			var outDir = options.outputDirectory.replace(HASH_REGEXP, hash);
			createDir(outDir, function(err) {
				options.events.emit("task-end", "create ouput directory");
				if(err) return callback(err);
				writeFiles();
			});

			// collect file sizes
			var fileSizeMap = {};

			// do the writing of all generated files
			function writeFiles() {
				var remFiles = fileWrites.length;
				fileWrites.forEach(function(writeAction) {
					var writeActionFileName = writeAction[0].replace(HASH_REGEXP, hash)
					options.events.emit("task", "write " + writeActionFileName);
					fileSizeMap[path.basename(writeActionFileName)] = writeAction[1].length;
					fs.writeFile(writeActionFileName, writeAction[1], "utf-8", function(err) {
						options.events.emit("task-end", "write " + writeActionFileName);
						if(err) throw err;
						remFiles--;
						if(remFiles === 0)
							writingFinished();
					});
				});
				if(fileWrites.length == 0) writingFinished();
			}

			// after writing: generate statistics
			function writingFinished() {
				// Stats
				buffer = {};
				buffer.hash = hash;
				buffer.chunkCount = chunksCount;
				buffer.modulesCount = Object.keys(depTree.modules).length;
				var sum = 0;
				chunkIds.reverse().forEach(function(chunkId) {
					var chunk = depTree.chunks[chunkId]
					if(!chunk.filename) return;
					var modulesArray = [];
					for(var moduleId in chunk.modules) {
						if(chunk.modules[moduleId] === "include") {
							var modu = depTree.modules[moduleId];
							modulesArray.push({
								id: modu.realId,
								size: modu.size,
								filename: modu.filename,
								dirname: modu.dirname,
								fromCache: modu.fromCache,
								toCache: modu.toCache,
								reasons: modu.reasons});
							sum++;
						}
					}
					modulesArray.sort(function(a, b) {
						return a.id - b.id;
					});
					fileModulesMap[path.basename(chunk.filename)] = modulesArray;
				});
				buffer.modulesIncludingDuplicates = sum;
				buffer.modulesPerChunk = Math.round(sum / chunksCount*10)/10; // DEPRECATED: useless info
				sum = 0;
				for(var moduleId in depTree.chunks.main.modules) {
					if(depTree.chunks.main.modules[moduleId] === "include")
						sum++;
				}
				buffer.modulesFirstChunk = sum;
				buffer.fileSizes = fileSizeMap;
				buffer.warnings = depTree.warnings;
				buffer.errors = depTree.errors;
				buffer.fileModules = fileModulesMap;
				buffer.subStats = subStats;
				buffer.time = new Date() - startTime;
				options.events.emit("task-end", "statistics");
				options.events.emit("bundle", buffer);
				callback(null, buffer);
			}
		} else { // if options.output not set, we write to stdout
				 // THIS IS DEPRECATED
			if(options.libary) {
				buffer.push("/******/var ");
				buffer.push(options.libary);
				buffer.push("=\n");
			}
			buffer.push(getTemplate(options, {chunks: false}));
			buffer.push("/******/({\n");
			buffer.push(writeChunk(depTree, options));
			buffer.push("/******/})");
			buffer = buffer.join("");
			try {
				if(options.minimize) buffer = uglify(buffer, "output");
				options.events.emit("task-end", "statistics");
				callback(null, buffer);
			} catch(e) {
				callback(e);
			}
		}
	});
	return options.events;
}

// returns the template for specific options
function getTemplate(options, templateOptions) {
	if(options.template) {
		if(typeof options.template === "string")
			return require(options.template)(options, templateOptions);
		else
			return options.template(options, templateOptions);
	} else
		return require("../templates/browser")(options, templateOptions);
}

// minimize it the uglify
function uglify(input, filename) {
	var uglify = require("uglify-js");
	try {
		source = uglify.parser.parse(input);
		source = uglify.uglify.ast_mangle(source);
		source = uglify.uglify.ast_squeeze(source);
		source = uglify.uglify.gen_code(source);
	} catch(e) {
		throw new Error(filename + " @ Line " + e.line + ", Col " + e.col + ", " + e.message);
		return input;
	}
	return source;
}