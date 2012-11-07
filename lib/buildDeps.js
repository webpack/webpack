/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var resolve = require("enhanced-resolve");
var execLoaders = require("enhanced-require/lib/execLoaders");
var matchRegExpObject = require("enhanced-resolve/lib/matchRegExpObject");
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
		chunkCount: 0,
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
			if(depTree.modulesById[0]) {
				depTree.errors.push("Entry module failed!\n " + err +
					"\n @ " + mainModule);
				id = 0;
			} else {
				return callback(err);
			}
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

			// remove duplicate and empty chunks
			checkObsolete(depTree, depTree.chunks[chunkId]);
		}

		if(options.maxChunks) {
			while(depTree.chunkCount > options.maxChunks) {
				if(!removeOneChunk(depTree, options, true))
					break;
			}
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
		separateResolve :
		resolve;
	resolveFunc(context = context || path.dirname(modu), modu, options.resolve, resolved);
	function resolved(err, request) {
		if(err) {
			callback(err);
			return;
		}
		// check if the module is already included
		if(depTree.modules[request]) {
			depTree.modules[request].reasons.push(reason);
			callback(null, depTree.modules[request].id);
		} else {
			profile && (profile.resolveEnd = new Date());
			// create a new module
			var modu = depTree.modules[request] = {
				id: depTree.nextModuleId++,
				request: request,
				reasons: [reason]
			};
			depTree.modulesById[modu.id] = modu;

			profile && (profile.module = modu);

			var requestObj = resolve.parse(request);

			if(options.cache) {
				options.cache.get(request, function(err, cachedData) {
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
				// match pre and post loaders from resource
				var preLoaders = options.preLoaders && requestObj.resource && requestObj.resource.path ? matchLoadersList(options.preLoaders) : "";
				var postLoaders = options.postLoaders && requestObj.resource && requestObj.resource.path ? matchLoadersList(options.postLoaders) : "";

				// get the current function for loader resolving
				var resolveLoadersFunc = !options.workersNoResolve && options.workers && options.workers.ready() ?
					separateResolveLoaders :
					resolve.loaders;

				// resolve preLoaders
				if(preLoaders) resolveLoadersFunc(context, preLoaders, options.resolve, onPreLoadersResolved);
				else onPreLoadersResolved(null, []);
				function onPreLoadersResolved(err, preLoaders) {
					if(err) return callback(err);

					// resolve postLoaders
					if(postLoaders) resolveLoadersFunc(context, postLoaders, options.resolve, onPostLoadersResolved);
					else onPostLoadersResolved(null, []);
					function onPostLoadersResolved(err, postLoaders) {
						if(err) return callback(err);
						profile && (profile.resolvePrePostLoadersEnd = new Date());

						// put all loaders in a list
						var allLoaders = [];
						if(preLoaders.length > 0)
							allLoaders.push.apply(allLoaders, preLoaders = preLoaders.map(resolve.parse.part));
						if(requestObj.loaders && requestObj.loaders.length > 0)
							allLoaders.push.apply(allLoaders, requestObj.loaders);
						if(postLoaders.length > 0)
							allLoaders.push.apply(allLoaders, postLoaders = postLoaders.map(resolve.parse.part));

						// store the list in the module
						modu.loaders = allLoaders;

						// and put premature dependencies into module (in case of loader error)
						modu.dependencies = requestObj.resource &&
							requestObj.resource.path &&
							[requestObj.resource.path] ||
							[];

						// check if it is possible to separate the process
						var separate = !!(options.workers &&
							options.workers.ready() &&
							allLoaders.length >= (options.workerMinLoaders || 0));
						try {
							for(var i = 0; i < allLoaders.length && separate; i++) {
								var loaderFilename = allLoaders[i].path;
								var loader = require(loaderFilename);
								if(!(loader.separable || loader.seperable) &&
									(!(loader.separableIfResolve || loader.seperableIfResolve) || options.workersNoResolve))
									separate = false;
							}
						} catch(e) {
							// Syntax error in loader
							return callback(e);
						}
						modu.separate = separate;

						var buildModuleStart = new Date();
						profile && (profile.loadersCheckEnd = buildModuleStart);
						(separate ? separateBuildModule : buildModule)(
							context, request,
							preLoaders, requestObj.loaders || [], postLoaders,
							requestObj,
							options, function(err, extraResults, source, deps) {

							var dependencyInfo = extraResults && extraResults.dependencyInfo;
							if(dependencyInfo) modu.dependencies = dependencyInfo.files; // It my be also supplied if err is set.
							if(extraResults && extraResults.warnings && extraResults.warnings.length > 0) {
								extraResults.warnings.forEach(function(w) {
									depTree.warnings.push(w + "\n @ loader @ " + request);
								});
								modu.warnings = extraResults.warnings;
							}
							if(extraResults && extraResults.errors && extraResults.errors.length > 0) {
								extraResults.errors.forEach(function(e) {
									depTree.errors.push(e + "\n @ loader @ " + request);
								});
								modu.errors = extraResults.errors;
							}
							if(err) {
								modu.error = err;
								return callback(err);
							}

							if(profile) {
								profile.buildModule = extraResults.profile;
								profile.buildModuleEnd = new Date();
							}
							if(dependencyInfo.cacheable && options.cache) {
								modu.toCache = true;
								options.cache.store(request, dependencyInfo.files, buildModuleStart, JSON.stringify({
									deps: deps,
									source: source,
									dependencies: dependencyInfo.files,
									loaders: allLoaders.map(function(l) { return l.path; })
								}));
							}
							return processParsedJs(source, deps);
						});
					}
				}
			}

			function matchLoadersList(list) {
				return list.filter(function(item) {
					return matchRegExpObject(item, requestObj.resource.path);
				}).map(function(item) {
					return item.loader || item.loaders.join("!");
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
				var requireContext = requestObj.resource &&
					requestObj.resource.path &&
					path.dirname(requestObj.resource.path) ||
					context;
				if(requiresNames.length)
					requiresNames.forEach(function(moduleName) {
						var reason = {
							type: "require",
							async: !directRequire[moduleName] || undefined,
							count: requires[moduleName].length,
							request: request,
							filename: requestObj.resource && requestObj.resource.path
						};

						// create or get the module for each require
						addModule(depTree, requireContext, moduleName, options, reason, function(err, moduleId) {
							if(err) {
								var error = false;
								requires[moduleName].forEach(function(requireItem) {
									if(!requireItem.inTry)
										error = true;
								});
								(error ? depTree.errors : depTree.warnings).push("Cannot find module '" + moduleName + "'\n " + err +
									"\n @ " + request + " (line " + requires[moduleName][0].line + ", column " + requires[moduleName][0].column + ")");
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
							type: "context",
							async: !directContexts[context.name] || undefined,
							request: request,
							filename: requestObj.resource && requestObj.resource.path
						};

						// create of get the context module for each require.context
						addContextModule(depTree, requireContext, context.name, options, reason, function(err, contextModuleId) {
							if(err) {
								depTree.errors.push("Cannot find context '"+context.name+"'\n " + err +
												"\n @ " + request + " (line " + context.line + ", column " + context.column + ")");
							} else {
								context.id = contextModuleId;
								module.requires.push({id: context.id});
							}
							endOne();
						});
						if(context.warn) {
							depTree.warnings.push(request + " (line " + context.line + ", column " + context.column + "): " +
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
							options.events.emit("module", modu, requestObj.resource && requestObj.resource.path);
							callback(null, modu.id);
						}
					}
				}
			}
		}
	}

	function separateBuildModule(context, requestObj,
			preLoaders, loaders, postLoaders,
			filename, options, callback) {
		var opt = {};
		Object.keys(options).forEach(function(name) {
			if(name == "internal") return;
			if(name == "events") return;
			if(name == "workers") return;
			opt[name] = options[name];
		});
		options.workers.run("buildModule", context, requestObj,
				preLoaders, loaders, postLoaders,
				filename, opt, function(err, extraResults, source, deps) {
			if(err) err = {
				message: err.message,
				stack: err.stack,
				_toString: err._toString,
				toString: function() {
					return this._toString
				}
			}
			callback(err, extraResults, source, deps);
		});
	}

	function separateResolve() {
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

	function separateResolveLoaders() {
		var args = Array.prototype.slice.call(arguments, 0);
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
		options.workers.run.apply(options.workers, args);
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
			var extensions = (options.resolve && options.resolve.extensions) || [""];

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
										// modules directories are excluded
										if(options.resolve.modulesDirectories.indexOf(file) >= 0)
											endOne();
										else
											doDir(filename, moduleName + "/" + file, endOne);
									} else {
										var match = false;
										if(loaders.length === 0)
											extensions.forEach(function(ext) {
												if(file.substr(file.length - ext.length) === ext)
													match = true;
											});
										if(!match && loaders.length === 0) {
											endOne();
											return;
										}
										var modulereason = {
											type: "context",
											async: reason.async,
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
		if(typeof a.request === "string" || typeof b.request === "string") {
			if(typeof a.request !== "string")
				return -1;
			if(typeof b.request !== "string")
				return 1;
			if(a.request === b.request)
				return 0;
			return (a.request < b.request) ? -1 : 1;
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
		depTree.chunkCount++;
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

function checkObsolete(depTree, chunk) {
	var modules = [];
	for(var moduleId in chunk.modules) {
		if(chunk.modules[moduleId] === "include") {
			modules.push(moduleId);
		}
	}
	if(modules.length === 0) {
		chunk.contexts.forEach(function(c) { c.chunkId = null; });
		chunk.empty = true;
		depTree.chunkCount--;
		return;
	}
	modules.sort();
	var moduleString = modules.join(" ");
	if(depTree.chunkModules[moduleString]) {
		chunk.equals = depTree.chunkModules[moduleString];
		chunk.contexts.forEach(function(c) {
			c.chunkId = chunk.equals;
		});
		depTree.chunkCount--;
	} else
		depTree.chunkModules[moduleString] = chunk.id;
}

function moduleSize(depTree, moduleId) {
	return depTree.modulesById[moduleId].source && depTree.modulesById[moduleId].source.length || 0;
}

function removeOneChunk(depTree, options, force) {
	var chunks = [];
	for(var chunkId in depTree.chunks) {
		var chunk = depTree.chunks[chunkId];
		if(!chunk.empty && !chunk.equals && chunk.id != "main") {
			chunks.push(chunk);
		}
	}
	var best = null;
	chunks.forEach(function(chunkA, idxA) {
		chunks.forEach(function(chunkB, idxB) {
			if(idxB <= idxA) return;
			var sizeSum = 60, sizeMerged = 30;
			for(var moduleId in chunkA.modules) {
				if(chunkA.modules[moduleId] === "include") {
					var size = moduleSize(depTree, moduleId);
					sizeSum += size + 10;
					sizeMerged += size + 10;
				}
			}
			for(var moduleId in chunkB.modules) {
				if(chunkB.modules[moduleId] === "include") {
					var size = moduleSize(depTree, moduleId);
					sizeSum += size + 10;
					if(chunkA.modules[moduleId] !== "include")
						sizeMerged += size + 10;
				}
			}
			var value = sizeSum - sizeMerged * (options.mergeSizeRatio === undefined ? 1.2 : options.mergeSizeRatio + 1);
			if(best == null || best[0] < value)
				best = [value, chunkA.id, chunkB.id];
		});
	});
	if(!best) return false;
	if(force || best[0] > 0) {
		var chunk = depTree.chunks[best[1]];
		chunk.equals = best[2];
		chunk.contexts.forEach(function(c) {
			c.chunkId = chunk.equals;
		});
		chunks.forEach(function(chunk) {
			if(chunk.equals == best[1]) {
				chunk.equals = best[2];
				chunk.contexts.forEach(function(c) {
					c.chunkId = chunk.equals;
				});
			}
		});
		var otherChunk = depTree.chunks[best[2]];
		for(var moduleId in chunk.modules) {
			if(chunk.modules[moduleId] === "include") {
				otherChunk.modules[moduleId] = "include";
			}
		}
		depTree.chunkCount--;
		return true;
	}
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