/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var parse = require("./parse");
var resolve = require("enhanced-resolve");
var execLoaders = require("enhanced-require/lib/execLoaders");
var buildModule = require("./buildModule");
var fs = require("fs");
var path = require("path");
var assert = require("assert");

/**
 * @param context: 		current directory
 * @param mainModule: 	the entrance module
 * @param options:		options
 * @param callback: 	function(err, result)
 */
module.exports = function buildDeps(context, mainModule, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}

	// options.events mock for tests
	if(!options) options = {};
	if(!options.events) options.events = { emit: function() {} };

	// create data structure
	var depTree = {
		warnings: [],
		errors: [],
		modules: {},
		modulesById: {},
		chunks: {},
		nextModuleId: 0,
		nextChunkId: 1,
		chunkModules: {} // used by checkObsolete
	}

	// some progress info
	options.events.emit("task", "build modules");
	options.events.emit("task", "build chunks");
	options.events.emit("task", "optimize");
	options.events.emit("task", "cleanup");

	// add the entrance file as module
	// all other stuff is added recursivly
	addModule(depTree, context, mainModule, options, {type: "main"}, function(err, id) {
		if(err) {
			callback(err);
			return;
		}
		buildTree(id);
	});

	// enhance the tree
	function buildTree(mainModuleId) {
		options.events.emit("task-end", "build modules");

		// split the modules into chunks
		depTree.modulesById[mainModuleId].name = "main";
		addChunk(depTree, depTree.modulesById[mainModuleId], options);

		// rename the module ids after a defined sheme
		createRealIds(depTree, options);
		options.events.emit("task-end", "build chunks");

		for(var chunkId in depTree.chunks) {
			// remove modules which are included in parent chunk
			removeParentsModules(depTree, depTree.chunks[chunkId]);

			// remove the chunk if it is empty
			removeChunkIfEmpty(depTree, depTree.chunks[chunkId]);

			// remove duplicate chunks
			checkObsolete(depTree, depTree.chunks[chunkId]);
		}

		createRealChunkIds(depTree, options);
		options.events.emit("task-end", "optimize");

		// cleanup temporary stuff
		delete depTree.chunkModules;
		depTree.modulesByFile = depTree.modules;
		depTree.modules = depTree.modulesById;
		delete depTree.modulesById;
		delete depTree.nextModuleId;
		delete depTree.nextChunkId;

		// return
		options.events.emit("task-end", "cleanup");
		callback(null, depTree);
	}
}

function addModule(depTree, context, modu, options, reason, finalCallback) {
	var profile = options.profile && {
		start: new Date()
	};

	options.events.emit("task");
	function callback(err, result) {
		options.events.emit("task-end");
		if(profile && profile.module) {
			profile.end = new Date();
			if(profile.buildModule) {
				profile.module.profile = {
					time: profile.end - profile.start,
					timeResolve: profile.resolveEnd - profile.start,
					timeResolvePrePostLoaders: profile.resolvePrePostLoadersEnd - profile.resolveEnd,
					timeLoadersCheck: profile.loadersCheckEnd - profile.resolvePrePostLoadersEnd,
					timeBuildWaiting: (profile.buildModuleEnd - profile.loadersCheckEnd) - (profile.buildModule.end - profile.buildModule.start),
					timeBuildModule: profile.buildModule.end - profile.buildModule.start,
					timeBuildModuleRead: profile.buildModule.readEnd - profile.buildModule.start,
					timeBuildModulePreLoaders: profile.buildModule.preLoadersEnd - profile.buildModule.readEnd,
					timeBuildModuleLoaders: profile.buildModule.loadersEnd - profile.buildModule.preLoadersEnd,
					timeBuildModulePostLoaders: profile.buildModule.postLoadersEnd - profile.buildModule.loadersEnd,
					timeBuildModuleParse: profile.buildModule.end - profile.buildModule.postLoadersEnd,
					timeChildren: profile.end - profile.buildModuleEnd
				}
			}
		}
		finalCallback(err, result);
	}

	// resolve the filename of the required module
	var resolveFunc = !options.workersNoResolve && options.workers && options.workers.ready() ?
		seperateResolve :
		resolve;
	resolveFunc(context = context || path.dirname(modu), modu, options.resolve, resolved);
	function resolved(err, filename) {
		if(err) {
			callback(err);
			return;
		}
		// check if the module is already included
		if(depTree.modules[filename]) {
			depTree.modules[filename].reasons.push(reason);
			callback(null, depTree.modules[filename].id);
		} else {
			profile && (profile.resolveEnd = new Date());
			// create a new module
			var modu = depTree.modules[filename] = {
				id: depTree.nextModuleId++,
				filename: filename,
				reasons: [reason]
			};
			depTree.modulesById[modu.id] = modu;

			profile && (profile.module = modu);

			// split the loaders from the require
			var filenameWithLoaders = filename;
			var loaders = filename.split(/!/g);
			filename = loaders.pop();

			if(options.cache) {
				options.cache.get(filenameWithLoaders, function(err, cachedData) {
					if(err) return readFile();
					if(profile) {
						profile.buildModuleEnd = profile.loadersCheckEnd = profile.resolvePrePostLoadersEnd = new Date()
					}
					modu.fromCache = true;
					cachedData = JSON.parse(cachedData);
					modu.dependencies = cachedData.dependencies;
					modu.loaders = cachedData.loaders;
					processParsedJs(cachedData.source, cachedData.deps);
				});
			} else
				readFile();

			// Read the file and process it with loaders
			// [this step is cached]
			function readFile() {
				// read file content
				var preLoaders = options.preLoaders ? matchLoadersList(options.preLoaders) : "";
				var postLoaders = options.postLoaders ? matchLoadersList(options.postLoaders) : "";

				var resolveLoadersFunc = !options.workersNoResolve && options.workers && options.workers.ready() ?
					seperateResolveLoaders :
					resolve.loaders;

				if(preLoaders) resolveLoadersFunc(context, preLoaders, options.resolve, onPreLoadersResolved);
				else onPreLoadersResolved(null, []);
				function onPreLoadersResolved(err, preLoaders) {
					if(err) return callback(err);
					if(postLoaders) resolveLoadersFunc(context, postLoaders, options.resolve, onPostLoadersResolved);
					else onPostLoadersResolved(null, []);
					function onPostLoadersResolved(err, postLoaders) {
						if(err) return callback(err);
						profile && (profile.resolvePrePostLoadersEnd = new Date());
						var allLoaders = [];
						allLoaders.push.apply(allLoaders, preLoaders);
						allLoaders.push.apply(allLoaders, loaders);
						allLoaders.push.apply(allLoaders, postLoaders);
						modu.loaders = allLoaders;
						modu.dependencies = [filename];
						var seperate = !!(options.workers &&
							options.workers.ready() &&
							allLoaders.length >= (options.workerMinLoaders || 0));
						try {
							for(var i = 0; i < allLoaders.length && seperate; i++) {
								var loaderFilename = allLoaders[i];
								var loader = require(loaderFilename);
								if(!loader.seperable && (!loader.seperableIfResolve || options.workersNoResolve))
									seperate = false;
							}
						} catch(e) {
							return callback(e);
						}
						modu.seperate = seperate;
						var buildModuleStart = new Date();
						profile && (profile.loadersCheckEnd = buildModuleStart);
						(seperate ? seperateBuildModule : buildModule)(
							context, filenameWithLoaders,
							preLoaders, loaders, postLoaders,
							filename,
							options, function(err, source, deps, dependencyInfo, profileBuild) {

							if(dependencyInfo) modu.dependencies = dependencyInfo.files; // It my be also supplied if err is set.
							if(err) {
								modu.error = err;
								return callback(err);
							}

							if(profile) {
								profile.buildModule = profileBuild;
								profile.buildModuleEnd = new Date();
							}
							if(dependencyInfo.cacheable && options.cache) {
								modu.toCache = true;
								options.cache.store(filenameWithLoaders, dependencyInfo.files, buildModuleStart, JSON.stringify({
									deps: deps,
									source: source,
									dependencies: dependencyInfo.files,
									loaders: allLoaders
								}));
							}
							return processParsedJs(source, deps);
						});
					}
				}
			}

			function matchLoadersList(list) {
				return list.filter(function(item) {
					var regExp = item.test;
					if(typeof regExp == "string") regExp = new RegExp(regExp);
					return (regExp.test(filename));
				}).map(function(item) {
					return item.loader;
				}).join("!");
			}

			// process the final parsed javascript code
			function processParsedJs(source, deps) {
				modu.requires = deps.requires || [];
				modu.asyncs = deps.asyncs || [];
				modu.contexts = deps.contexts || [];
				modu.source = source;

				var requires = {}, directRequire = {};
				var contexts = [], directContexts = {};
				function add(r) {
					if(!r.name) return;
					requires[r.name] = requires[r.name] || [];
					requires[r.name].push(r);
				}
				function addContext(m) {
					return function(c) {
						contexts.push({context: c, module: m});
					}
				}
				if(modu.requires) {
					modu.requires.forEach(add);
					modu.requires.forEach(function(r) {
						if(!r.name) return;
						directRequire[r.name] = true;
					});
				}
				if(modu.contexts) {
					modu.contexts.forEach(addContext(modu));
					modu.contexts.forEach(function(c) {
						directContexts[c.name] = true;
					});
				}
				if(modu.asyncs)
					modu.asyncs.forEach(function addAsync(c) {
						if(c.requires)
							c.requires.forEach(add);
						if(c.asyncs)
							c.asyncs.forEach(addAsync);
						if(c.contexts)
							c.contexts.forEach(addContext(c));
					});
				var requiresNames = Object.keys(requires);
				var count = requiresNames.length + contexts.length + 1;
				var errors = [];
				if(requiresNames.length)
					requiresNames.forEach(function(moduleName) {
						var reason = {
							type: directRequire[moduleName] ? "require" : "async require",
							count: requires[moduleName].length,
							filename: filenameWithLoaders
						};

						// create or get the module for each require
						addModule(depTree, path.dirname(filename), moduleName, options, reason, function(err, moduleId) {
							if(err) {
								depTree.errors.push("Cannot find module '" + moduleName + "'\n " + err +
									"\n @ " + filename + " (line " + requires[moduleName][0].line + ", column " + requires[moduleName][0].column + ")");
							} else {
								requires[moduleName].forEach(function(requireItem) {
									requireItem.id = moduleId;
								});
							}
							endOne();
						});
					});
				if(contexts) {
					contexts.forEach(function(contextObj) {
						var context = contextObj.context;
						var module = contextObj.module;
						var reason = {
							type: directContexts[context.name] ? "context" : "async context",
							filename: filenameWithLoaders
						};

						// create of get the context module for each require.context
						addContextModule(depTree, path.dirname(filename), context.name, options, reason, function(err, contextModuleId) {
							if(err) {
								depTree.errors.push("Cannot find context '"+context.name+"'\n " + err +
												"\n @ " + filename + " (line " + context.line + ", column " + context.column + ")");
							} else {
								context.id = contextModuleId;
								module.requires.push({id: context.id});
							}
							endOne();
						});
						if(context.warn) {
							depTree.warnings.push(filename + " (line " + context.line + ", column " + context.column + "): " +
								"implicit use of require.context(\".\") is not recommended.");
						}
					});
				}
				endOne();
				function endOne() {
					count--;
					assert(count >= 0);
					if(count === 0) {
						if(errors.length) {
							callback(errors.join("\n"));
						} else {
							options.events.emit("module", modu, filename);
							callback(null, modu.id);
						}
					}
				}
			}
		}
	}

	function seperateBuildModule(context, filenameWithLoaders,
			preLoaders, loaders, postLoaders,
			filename, options, callback) {
		var opt = {};
		Object.keys(options).forEach(function(name) {
			if(name == "internal") return;
			if(name == "events") return;
			if(name == "workers") return;
			opt[name] = options[name];
		});
		options.workers.run("buildModule", context, filenameWithLoaders,
				preLoaders, loaders, postLoaders,
				filename, opt, function(err, source, deps, cacheInfo, profileBuild) {
			if(err) err = {
				message: err.message,
				stack: err.stack,
				_toString: err._toString,
				toString: function() {
					return this._toString
				}
			}
			callback(err, source, deps, cacheInfo, profileBuild);
		});
	}

	function seperateResolve() {
		var args = Array.prototype.slice.call(arguments, 0);
		args.unshift("resolve");
		var callback = args.pop();
		args.push(function(err, filename) {
			if(err) err = {
				message: err.message,
				stack: err.stack,
				_toString: err._toString,
				toString: function() {
					return this._toString
				}
			}
			callback(err, filename);
		});
		options.workers.run.apply(options.workers, args);
	}

	function seperateResolveLoaders() {
		var args = Array.prototype.slice.call(arguments, 0);
		var workers = args[0];
		args.unshift("resolve.loaders");
		var callback = args.pop();
		args.push(function(err, loaders) {
			if(err) err = {
				message: err.message,
				stack: err.stack,
				_toString: err._toString,
				toString: function() {
					return this._toString
				}
			}
			callback(err, loaders);
		});
		workers.run.apply(workers, args);
	}
}

function addContextModule(depTree, context, contextModuleName, options, reason, finalCallback) {
	options.events.emit("task");
	function callback(err, result) {
		options.events.emit("task-end");
		finalCallback(err, result);
	}

	// resolve the filename of the required context
	resolve.context(context, contextModuleName, options.resolve, resolved);
	function resolved(err, dirname) {
		if(err) {
			callback(err);
			return;
		}
		// check if the context is already included
		if(depTree.modules[dirname]) {
			depTree.modules[dirname].reasons.push(reason);
			callback(null, depTree.modules[dirname].id);
		} else {
			// create a new context
			var contextModule = depTree.modules[dirname] = {
				name: contextModuleName,
				dirname: dirname,
				id: depTree.nextModuleId++,
				requireMap: {},
				requires: [],
				reasons: [reason]
			};
			depTree.modulesById[contextModule.id] = contextModule;

			// split the loaders from the require
			var contextModuleNameWithLoaders = dirname;
			var loaders = dirname.split(/!/g);
			dirname = loaders.pop();
			options.events.emit("context-enum", contextModule, dirname);
			var prependLoaders = loaders.length === 0 ? "" : loaders.join("!") + "!";
			var extensions = (options.resolve && options.resolve.extensions) || [".web.js", ".js"];

			// iterate all files in directory
			function doDir(dirname, moduleName, done) {
				fs.readdir(dirname, function(err, list) {
					if(err) {
						done(err);
					} else {
						var count = list.length + 1;
						var errors = [];
						function endOne(err) {
							if(err) {
								errors.push(err);
							}
							count--;
							assert(count >= 0);
							if(count == 0) {
								if(errors.length > 0)
									done(errors.join("\n"));
								else
									done();
							}
						}
						list.forEach(function(file) {
							var filename = path.join(dirname, file);
							fs.stat(filename, function(err, stat) {
								if(err) {
									errors.push(err);
									endOne();
								} else {
									if(stat.isDirectory()) {
										// node_modules and web_modules directories are excluded
										if(file === "node_modules" || file === "web_modules")
											endOne();
										else
											doDir(filename, moduleName + "/" + file, endOne);
									} else {
										var match = false;
										if(loaders.length === 0)
											extensions.forEach(function(ext) {
												if(file.substr(file.length - ext.length) === ext)
													match = true;
												if(options.resolve && options.resolve.loaders)
													options.resolve.loaders.forEach(function(loader) {
														var test = loader.test;
														if(typeof test == "string") test = new RegExp(test);
														if(test.test(filename))
															match = true;
													});
											});
										if(!match && loaders.length === 0) {
											endOne();
											return;
										}
										var modulereason = {
											type: "context",
											dirname: contextModuleNameWithLoaders,
											filename: reason.filename
										};
										// add each file as module
										addModule(depTree, dirname, prependLoaders + filename, options, modulereason, function(err, moduleId) {
											if(err) {
												depTree.warnings.push("A file in context was excluded because of error: " + err);
												endOne();
											} else {
												contextModule.requires.push({id: moduleId});

												// store the module id in a require map
												// when generating the source it is included
												contextModule.requireMap[moduleName + "/" + file] = moduleId;
												endOne();
											}
										});
									}
								}
							});
						});
						endOne();
					}
				});
			}
			doDir(dirname, ".", function(err) {
				if(err) {
					callback(err);
					return;
				}
				options.events.emit("context", contextModule, dirname);
				callback(null, contextModule.id);
			});
		}
	}
}

// rename the module ids after a defined sheme
function createRealIds(depTree, options) {
	var sortedModules = [];
	for(var id in depTree.modulesById) {
		if(""+id === "0") continue;
		var modu = depTree.modulesById[id];
		var usages = 1;
		modu.reasons.forEach(function(reason) {
			usages += reason.count ? reason.count : 1;
		});
		modu.usages = usages;
		sortedModules.push(modu);
	}
	depTree.modulesById[0].realId = 0;
	sortedModules.sort(function(a, b) {
		if(a.chunks && b.chunks &&
			(a.chunks.indexOf("main") !== -1 || b.chunks.indexOf("main") !== -1)) {
			if(a.chunks.indexOf("main") === -1)
				return 1;
			if(b.chunks.indexOf("main") === -1)
				return -1;
		}
		var diff = b.usages - a.usages;
		if(diff !== 0) return diff;
		if(typeof a.filename === "string" || typeof b.filename === "string") {
			if(typeof a.filename !== "string")
				return -1;
			if(typeof b.filename !== "string")
				return 1;
			if(a.filename === b.filename)
				return 0;
			return (a.filename < b.filename) ? -1 : 1;
		}
		if(a.dirname === b.dirname)
			return 0;
		return (a.dirname < b.dirname) ? -1 : 1;
	});
	sortedModules.forEach(function(modu, idx) {
		modu.realId = idx + 1;
	});
}

// add a chunk
function addChunk(depTree, chunkStartpoint, options) {
	var chunk;
	if(chunkStartpoint && chunkStartpoint.name) {
		chunk = depTree.chunks[chunkStartpoint.name];
		if(chunk) {
			chunk.usages++;
			chunk.contexts.push(chunkStartpoint);
		}
	}
	if(!chunk) {
		chunk = {
			id: (chunkStartpoint && chunkStartpoint.name) || depTree.nextChunkId++,
			modules: {},
			contexts: chunkStartpoint ? [chunkStartpoint] : [],
			usages: 1
		};
		depTree.chunks[chunk.id] = chunk;
	}
	if(chunkStartpoint) {
		chunkStartpoint.chunkId = chunk.id;
		addModuleToChunk(depTree, chunkStartpoint, chunk.id, options);
	}
	return chunk;
}

function addModuleToChunk(depTree, context, chunkId, options) {
	context.chunks = context.chunks || [];
	if(context.chunks.indexOf(chunkId) === -1) {
		context.chunks.push(chunkId);
		if(context.id !== undefined)
			depTree.chunks[chunkId].modules[context.id] = "include";
		if(context.requires) {
			context.requires.forEach(function(requireItem) {
				if(requireItem.id)
					addModuleToChunk(depTree, depTree.modulesById[requireItem.id], chunkId, options);
			});
		}
		if(context.asyncs) {
			context.asyncs.forEach(function(context) {
				if(options.single) {
					addModuleToChunk(depTree, context, chunkId, options);
				} else {
					var subChunk;
					if(context.chunkId) {
						subChunk = depTree.chunks[context.chunkId];
						subChunk.usages++;
					} else {
						subChunk = addChunk(depTree, context, options);
					}
					subChunk.parents = subChunk.parents || [];
					subChunk.parents.push(chunkId);
				}
			});
		}
	}
}

function removeParentsModules(depTree, chunk) {
	if(!chunk.parents) return;
	for(var moduleId in chunk.modules) {
		var inParent = true;
		var checkedParents = {};
		chunk.parents.forEach(function checkParent(parentId) {
			if(!inParent) return;
			if(checkedParents[parentId]) return;
			checkedParents[parentId] = true;
			if(!depTree.chunks[parentId].modules[moduleId]) {
				var parents = depTree.chunks[parentId].parents;
				if(parents && parents.length > 0)
					parents.forEach(checkParent);
				else
					inParent = false;
			}
		});
		if(inParent) {
			chunk.modules[moduleId] = "in-parent";
		}
	}
}

function removeChunkIfEmpty(depTree, chunk) {
	var hasModules = false;
	for(var moduleId in chunk.modules) {
		if(chunk.modules[moduleId] === "include") {
			hasModules = true;
			break;
		}
	}
	if(!hasModules) {
		chunk.contexts.forEach(function(c) { c.chunkId = null; });
		chunk.empty = true;
	}
}

function checkObsolete(depTree, chunk) {
	var modules = [];
	for(var moduleId in chunk.modules) {
		if(chunk.modules[moduleId] === "include") {
			modules.push(moduleId);
		}
	}
	if(modules.length === 0) return;
	modules.sort();
	var moduleString = modules.join(" ");
	if(depTree.chunkModules[moduleString]) {
		chunk.equals = depTree.chunkModules[moduleString];
		chunk.contexts.forEach(function(c) {
			c.chunkId = chunk.equals;
		});
	} else
		depTree.chunkModules[moduleString] = chunk.id;
}

// rename the chunk ids after a defined sheme
function createRealChunkIds(depTree, options) {
	var sortedChunks = [];
	for(var id in depTree.chunks) {
		if(id === "main") continue;
		var chunk = depTree.chunks[id];
		if(chunk.empty) continue;
		if(chunk.equals !== undefined) continue;
		sortedChunks.push(chunk);
	}
	depTree.chunks["main"].realId = 0;
	sortedChunks.sort(function(a, b) {
		if(a.usages < b.usages)
			return -1;
		if(a.usages > b.usages)
			return 1;
		var aCount = Object.keys(a.modules).length;
		var bCount = Object.keys(b.modules).length;
		if(aCount != bCount)
			return aCount - bCount;
		function genModulesString(modules) {
			var moduleIds = [];
			for(var id in modules) {
				if(modules[id] === "include") {
					var m = depTree.modulesById[id];
					moduleIds.push(m.realId);
				}
			}
			return moduleIds.sort().join("-");
		}
		var aModules = genModulesString(a.modules);
		var bModules = genModulesString(b.modules);
		if(aModules == bModules)
			return 0;
		return aModules < bModules ? -1 : 1;
	});
	sortedChunks.forEach(function(chunk, idx) {
		chunk.realId = idx + 1;
	});
}