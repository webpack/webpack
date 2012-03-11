/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var parse = require("./parse");
var resolve = require("./resolve");
var fs = require("fs");
var path = require("path");

/**
 * context: current directory
 * mainModule: the entrance module
 * options:
 * callback: function(err, result)
 */
module.exports = function buildDeps(context, mainModule, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	if(!options) options = {};

	var depTree = {
		modules: {},
		modulesById: {},
		chunks: {},
		nextModuleId: 0,
		nextChunkId: 0,
		chunkModules: {} // used by checkObsolete
	}
	var mainModuleId;
	addModule(depTree, context, mainModule, options, function(err, id) {
		if(err) {
			callback(err);
			return;
		}
		mainModuleId = id;
		buildTree();
	});
	function buildTree() {
		addChunk(depTree, depTree.modulesById[mainModuleId], options);
		for(var chunkId in depTree.chunks) {
			removeParentsModules(depTree, depTree.chunks[chunkId]);
			removeChunkIfEmpty(depTree, depTree.chunks[chunkId]);
			checkObsolete(depTree, depTree.chunks[chunkId]);
		}
		callback(null, depTree);
	}
}

function addModule(depTree, context, module, options, callback) {
	if(context)
		resolve(context, module, options.resolve, resolved);
	else
		resolved(null, module);
	function resolved(err, filename) {
		if(err) {
			callback(err);
			return;
		}
		if(depTree.modules[filename]) {
			callback(null, depTree.modules[filename].id);
		} else {
			var module = depTree.modules[filename] = {
				id: depTree.nextModuleId++,
				filename: filename
			};
			depTree.modulesById[module.id] = module;
			fs.readFile(filename, "utf-8", function(err, source) {
				if(err) {
					callback(err);
					return;
				}
				var deps = parse(source);
				module.requires = deps.requires || [];
				module.asyncs = deps.asyncs || [];
				module.contexts = deps.contexts || [];
				module.source = source;

				var requires = {};
				var contexts = [];
				function add(r) {
					requires[r.name] = requires[r.name] || [];
					requires[r.name].push(r);
				}
				function addContext(m) {
					return function(c) {
						contexts.push({context: c, module: m});
					}
				}
				if(module.requires)
					module.requires.forEach(add);
				if(module.contexts)
					module.contexts.forEach(addContext(module));
				if(module.asyncs)
					module.asyncs.forEach(function addAsync(c) {
						if(c.requires)
							c.requires.forEach(add);
						if(c.asyncs)
							c.asyncs.forEach(addAsync);
						if(c.contexts)
							c.contexts.forEach(addContext(c));
					});
				requiresNames = Object.keys(requires);
				var count = requiresNames.length + contexts.length + 1;
				var errors = [];
				if(requiresNames.length)
					requiresNames.forEach(function(moduleName) {
						addModule(depTree, path.dirname(filename), moduleName, options, function(err, moduleId) {
							if(err) {
								errors.push(err+"\n @ " + filename + " (line " + requires[moduleName][0].line + ", column " + requires[moduleName][0].column + ")");
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
						addContextModule(depTree, path.dirname(filename), context.name, options, function(err, contextModuleId) {
							if(err) {
								errors.push(err+"\n @ " + filename + " (line " + context.line + ", column " + context.column + ")");
							} else {
								context.id = contextModuleId;
								module.requires.push({id: context.id});
							}
							endOne();
						})
					});
				}
				endOne();
				function endOne() {
					count--;
					if(count === 0) {
						if(errors.length) {
							callback(errors.join("\n"));
						} else {
							callback(null, module.id);
						}
					}
				}
			});
		}
	}
}

function addContextModule(depTree, context, contextModuleName, options, callback) {
	resolve.context(context, contextModuleName, options.resolve, resolved);
	function resolved(err, dirname) {
		if(err) {
			callback(err);
			return;
		}
		if(depTree.modules[dirname]) {
			callback(null, depTree.modules[dirname].id);
		} else {
			var contextModule = depTree.modules[dirname] = {
				id: depTree.nextModuleId++,
				requireMap: {},
				requires: []
			};
			depTree.modulesById[contextModule.id] = contextModule;
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
										doDir(filename, moduleName + "/" + file, endOne);
									} else {
										addModule(depTree, null, filename, options, function(err, moduleId) {
											if(err) {
												endOne(err);
											} else {
												contextModule.requires.push({id: moduleId});
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
				var extensionsAccess = [];
				var extensions = (options.resolve && options.resolve.extensions) || [".web.js", ".js"];
				extensions.forEach(function(ext) {
					extensionsAccess.push("||map[name+\"");
					extensionsAccess.push(ext.replace(/"/g, "\\\""));
					extensionsAccess.push("\"]");
				});

				contextModule.source = "/***/module.exports = function(name) {\n" +
					"/***/\tvar map = " + JSON.stringify(contextModule.requireMap) + ";\n" +
					"/***/\treturn require(map[name]" + extensionsAccess.join("") + ");\n" +
					"/***/};";
				callback(null, contextModule.id);
			});
		}
	}
}

function addChunk(depTree, chunkStartpoint, options) {
	var chunk = {
		id: depTree.nextChunkId++,
		modules: {},
		context: chunkStartpoint
	};
	depTree.chunks[chunk.id] = chunk;
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
				addModuleToChunk(depTree, depTree.modulesById[requireItem.id], chunkId, options);
			});
		}
		if(context.asyncs) {
			context.asyncs.forEach(function(context) {
				var subChunk
				if(context.chunkId) {
					subChunk = depTree.chunks[context.chunkId];
				} else {
					subChunk = addChunk(depTree, context, options);
				}
				subChunk.parents = subChunk.parents || [];
				subChunk.parents.push(chunkId);
			});
		}
	}
}

function removeParentsModules(depTree, chunk) {
	if(!chunk.parents) return;
	for(var moduleId in chunk.modules) {
		var inParent = true;
		chunk.parents.forEach(function(parentId) {
			if(!depTree.chunks[parentId].modules[moduleId])
				inParent = false;
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
		chunk.context.chunkId = null;
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
		if(chunk.context)
			chunk.context.chunkId = chunk.equals;
	} else
		depTree.chunkModules[moduleString] = chunk.id;
}