/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("./Template");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
var ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
var ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");

function HotModuleReplacementPlugin(outputOptions) {
	this.outputOptions = outputOptions;
}
module.exports = HotModuleReplacementPlugin;

HotModuleReplacementPlugin.prototype.apply = function(compiler) {
	var hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename || "[id].[hash].hot-update.js";
	var hotUpdateFunction = this.outputOptions.hotUpdateFunction || ("webpackHotUpdate" + (this.outputOptions.library || ""));
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

		compilation.dependencyFactories.set(ModuleHotAcceptDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ModuleHotAcceptDependency, new ModuleHotAcceptDependency.Template());

		compilation.dependencyFactories.set(ModuleHotDeclineDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ModuleHotDeclineDependency, new ModuleHotDeclineDependency.Template());

		var hotUpdateChunkTemplate = compiler.hotUpdateChunkTemplate;
		compilation.plugin("record", function(compilation, records) {
			if(records.hash === this.hash) return;
			records.hash = compilation.hash;
			records.moduleHashs = {};
			this.modules.forEach(function(module) {
				var identifier = module.identifier();
				var hash = new (require("crypto")).Hash("md5");
				module.updateHash(hash);
				records.moduleHashs[identifier] = hash.digest("hex");
			});
			records.chunkHashs = {};
			this.chunks.forEach(function(chunk) {
				records.chunkHashs[chunk.id] = chunk.hash;
			});
			records.chunkModuleIds = {};
			this.chunks.forEach(function(chunk) {
				records.chunkModuleIds[chunk.id] = chunk.modules.map(function(m) { return m.id; });
			});
		});
		compilation.plugin("after-chunk-assets", function() {
			var records = this.records;
			if(records.hash === this.hash) return;
			if(!records.moduleHashs || !records.chunkHashs || !records.chunkModuleIds) return;
			var moduleHashs = {};
			this.modules.forEach(function(module) {
				var identifier = module.identifier();
				var hash = new (require("crypto")).Hash("md5");
				module.updateHash(hash);
				hash = hash.digest("hex");
				module.hotUpdate = records.moduleHashs[identifier] !== hash;
			});
			Object.keys(records.chunkHashs).forEach(function(chunkId) {
				chunkId = +chunkId;
				var newModules = [];
				var removedModules = records.chunkModuleIds[chunkId].slice();
				var currentChunk = this.chunks.filter(function(chunk) {
					return chunk.id === chunkId;
				})[0];
				if(currentChunk) {
					currentChunk.modules.forEach(function(module) {
						var idx = removedModules.indexOf(module.id);
						if(idx >= 0) {
							removedModules.splice(idx, 1);
							if(!module.hotUpdate) return;
						}
						newModules.push(module);
					});
				}
				newModules = removedModules.concat(newModules);
				var source = hotUpdateChunkTemplate.render(chunkId, newModules, this.hash, this.moduleTemplate, this.dependencyTemplates);
				var filename = hotUpdateChunkFilename
					.replace(Template.REGEXP_HASH, records.hash)
					.replace(Template.REGEXP_CHUNKHASH, records.chunkHashs[chunkId])
					.replace(Template.REGEXP_ID, chunkId);
				this.assets[filename] = source;
				if(currentChunk) {
					currentChunk.files.push(filename);
					this.applyPlugins("chunk-asset", currentChunk, filename);
				} else if(this.chunks[0]) {
					// TODO: good place for this? (minimizing is only on chunk assets)
					this.chunks[0].files.push(filename);
					this.applyPlugins("chunk-asset", this.chunks[0], filename);
				}
			}, this);
		});

		var mainTemplate = compilation.mainTemplate;
		compilation.mainTemplate = Object.create(mainTemplate);

		compilation.mainTemplate.updateHash = function(hash) {
			hash.update(compilation.records.hash + "");
			mainTemplate.updateHash(hash);
		};

		compilation.mainTemplate.renderRequireFunctionForModule = function(hash, chunk, varModuleId) {
			return "hotCreateRequire(" + varModuleId + ")";
		};

		compilation.mainTemplate.renderInit = function(hash, chunk) {
			var buf = mainTemplate.renderInit(hash, chunk);
			var currentHotUpdateChunkFilename = JSON.stringify(hotUpdateChunkFilename)
				.replace(Template.REGEXP_HASH, "\" + " + this.renderCurrentHashCode(hash) + " + \"")
				.replace(Template.REGEXP_ID, "\" + chunkId + \"");
			buf.push("this[" + JSON.stringify(hotUpdateFunction) + "] = " +
				(hotInitCode
					.replace(/\$require\$/g, this.requireFn)
					.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
					.replace(/\$hash\$/g, JSON.stringify(hash))
					.replace(/\/\*foreachInstalledChunks\*\//g, chunk.chunks.length > 0 ? "for(var chunkId in installedChunks)" : "var chunkId = 0;")));
			return buf;
		};

		compilation.mainTemplate.renderCurrentHashCode = function(hash) {
			return "hotCurrentHash";
		};

		compilation.mainTemplate.renderModule = function(hash, chunk, varModuleId) {
			var buf = mainTemplate.renderModule(hash, chunk, varModuleId);
			buf.push(buf.pop() + ",");
			buf.push("hot: hotCreateModule(" + varModuleId + "),");
			buf.push("parents: [hotCurrentParent],");
			buf.push("data: hotCurrentModuleData[" + varModuleId + "],");
			buf.push("children: []");
			return buf;
		};

	});
	compiler.parser.plugin("evaluate Identifier module.hot", function(expr) {
		return new BasicEvaluatedExpression().setBoolean(true).setRange(expr.range);
	});
	compiler.parser.plugin("call module.hot.accept", function(expr) {
		if(expr.arguments.length > 1) {
			var param = this.evaluateExpression(expr.arguments[0]);
			if(param.isString()) {
				var dep = new ModuleHotAcceptDependency(param.string, param.range);
				dep.optional = true;
				this.state.module.addDependency(dep);
			}
		}
		return true;
	});
	compiler.parser.plugin("call module.hot.decline", function(expr) {
		if(expr.arguments.length > 1) {
			var param = this.evaluateExpression(expr.arguments[0]);
			if(param.isString()) {
				var dep = new ModuleHotDeclineDependency(param.string, param.range);
				dep.optional = true;
				this.state.module.addDependency(dep);
			}
		}
		return true;
	});
	compiler.parser.plugin("expression module.hot", function() {
		return true;
	});
};

var hotInitCode = function() {
	function webpackHotUpdateCallback(newHash, chunkId, moreModules) {
		for(var moduleId in moreModules) {
			if(moreModules[moduleId])
				hotUpdate[moduleId] = moreModules[moduleId];
			else if(!hotUpdate[moduleId])
				hotUpdate[moduleId] = false;
		}
		hotUpdateNewHash = newHash;
		if(--hotWaitingFiles === 0 && hotChunksLoading === 0) {
			hotUpdateDownloaded();
		}
	}

	function hotUpdateDownloaded() {
		var outdatedDependencies = hotUpdateOutdatedDependencies = {};
		var outdatedModules = hotUpdateOutdatedModules = Object.keys(hotUpdate).map(function(id) {
			return +id;
		});
		var queue = outdatedModules.slice();
		while(queue.length > 0) {
			var moduleId = queue.pop();
			var module = installedModules[moduleId];
			if(!module || module.hot._selfAccepted)
				continue;
			if(module.hot._selfDeclined) {
				hotSetStatus("abort");
				return hotCallback(new Error("Aborted because of self decline: " + moduleId));
			}
			if(moduleId === 0) {
				hotSetStatus("abort");
				return hotCallback(new Error("Aborted because of bubbling"));
			}
			for(var i = 0; i < module.parents.length; i++) {
				var parentId = module.parents[i];
				var parent = installedModules[parentId];
				if(parent.hot._declinedDependencies[moduleId]) {
					hotSetStatus("abort");
					return hotCallback(new Error("Aborted because of declined dependency: " + moduleId + " in " + parentId));
				}
				if(outdatedModules.indexOf(parentId) >= 0) continue;
				if(parent.hot._acceptedDependencies[moduleId]) {
					if(!outdatedDependencies[parentId]) outdatedDependencies[parentId] = [];
					if(outdatedDependencies[parentId].indexOf(moduleId) >= 0) continue;
					outdatedDependencies[parentId].push(moduleId);
					continue;
				}
				delete outdatedDependencies[parentId];
				outdatedModules.push(parentId);
				queue.push(parentId);
			}
		}

		hotSetStatus("ready");
		if(hotApplyOnUpdate) {
			hotApply(hotCallback);
		} else {
			hotCallback(null, outdatedModules);
		}
	}

	var hotApplyOnUpdate = true;
	var hotCurrentHash = $hash$;
	var hotCurrentModuleData = {};
	var hotCurrentParent = 0;

	function hotCreateRequire(moduleId) {
		var me = installedModules[moduleId];
		var fn = function(request) {
			if(installedModules[request] && installedModules[request].parents.indexOf(moduleId) < 0)
				installedModules[request].parents.push(moduleId);
			if(me && me.children.indexOf(request) < 0)
				me.children.push(request);
			hotCurrentParent = moduleId;
			return $require$(request);
		};
		fn.e = function(chunkId, callback) {
			if(hotStatus === "ready") throw new Error("Cannot load chunks when update is ready");
			hotChunksLoading++;
			$require$.e(chunkId, function() {
				try {
					callback(fn);
				} catch(e) {
					finishChunkLoading();
					throw e;
				}
				finishChunkLoading();
				function finishChunkLoading() {
					hotChunksLoading--;
					if(hotStatus === "prepare") {
						if(!hotWaitingFilesMap[chunkId]) {
							hotDownloadUpdateChunk(chunkId);
						}
						if(hotChunksLoading === 0 && hotWaitingFiles === 0) {
							hotUpdateDownloaded();
						}
					}
				}
			});
		}
		fn.cache = $require$.cache;
		fn.modules = $require$.modules;
		return fn;
	}

	function hotCreateModule(moduleId) {
		var hot = {
			// private stuff
			_acceptedDependencies: {},
			_declinedDependencies: {},
			_selfAccepted: false,
			_selfDeclined: false,
			_disposeHandlers: [],

			// Module API
			accept: function(dep, callback) {
				if(typeof dep === "undefined")
					hot._selfAccepted = true;
				else if(typeof dep === "number")
					hot._acceptedDependencies[dep] = callback;
				else for(var i = 0; i < dep.length; i++)
					hot._acceptedDependencies[dep[i]] = callback;
			},
			decline: function(dep) {
				if(typeof dep === "undefined")
					hot._selfDeclined = true;
				else if(typeof dep === "number")
					hot._declinedDependencies[dep] = true;
				else for(var i = 0; i < dep.length; i++)
					hot._declinedDependencies[dep[i]] = true;
			},
			dispose: function(callback) {
				hot._disposeHandlers.push(callback);
			},
			addDisposeHandler: function(callback) {
				hot._disposeHandlers.push(callback);
			},
			removeDisposeHandler: function(callback) {
				var idx = hot._disposeHandlers.indexOf(callback);
				if(idx >= 0) hot._disposeHandlers.splice(idx, 1);
			},

			// Management API
			check: hotCheck,
			apply: hotApply,
			status: function(l) {
				if(!l) return hotStatus;
				hotStatusHandlers.push(l);
			},
			addStatusHandler: function(l) {
				hotStatusHandlers.push(l);
			},
			removeDisposeHandler: function(l) {
				var idx = hotStatusHandlers.indexOf(l);
				if(idx >= 0) hotStatusHandlers.splice(idx, 1);
			}
		};
		return hot;
	}

	var hotStatusHandlers = [];
	var hotStatus = "idle";
	function hotSetStatus(newStatus) {
		hotStatus = newStatus;
		// TODO notify listeners
	}

	var hotWaitingFiles = 0;
	var hotChunksLoading = 0;
	var hotWaitingFilesMap = {};
	var hotCallback;
	function hotCheck(callback) {
		callback = callback || function(err) { if(err) throw err };
		if(hotStatus !== "idle") throw new Error("check() is only allowed in idle status");
		if(typeof XMLHttpRequest === "undefined" || !Array.prototype.forEach || !Array.prototype.map || !Object.keys)
			return callback(new Error("No browser support"));
		hotSetStatus("check");

		try {
			var request = new XMLHttpRequest();
			var chunkId = 0;
			request.open("GET", modules.c + $hotChunkFilename$, true);
			request.send(null);
		} catch(err) {
			return callback(err);
		}
		request.onreadystatechange = function() {
			if(request.readyState !== 4) return;
			if(request.status !== 200 && request.status !== 304) {

				hotSetStatus("idle");
				callback(null, null);

			} else {

				hotWaitingFilesMap = {};
				hotSetStatus("prepare");
				hotCallback = callback;
				hotUpdate = {};
				var hash = hotCurrentHash;
				/*foreachInstalledChunks*/ {
					hotDownloadUpdateChunk(chunkId);
				}

			}
		};
	}
	function hotDownloadUpdateChunk(chunkId) {
		hotWaitingFiles++;
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.charset = 'utf-8';
		script.src = modules.c + $hotChunkFilename$;
		head.appendChild(script);
		hotWaitingFilesMap[chunkId] = true;
	}

	var hotUpdate, hotUpdateOutdatedDependencies, hotUpdateOutdatedModules, hotUpdateNewHash;

	function hotApply(callback) {
		var outdatedModules = hotUpdateOutdatedModules;
		var outdatedDependencies = hotUpdateOutdatedDependencies;
		var outdatedSelfAcceptedModules = outdatedModules.filter(function(moduleId) {
			return installedModules[moduleId] && installedModules[moduleId].hot._selfAccepted;
		});

		hotSetStatus("dispose");
		hotCurrentModuleData = {};
		outdatedModules.forEach(function(moduleId) {
			var data = {};
			var module = installedModules[moduleId];
			if(!module) return;
			module.hot._disposeHandlers.forEach(function(cb) {
				cb(data);
			});
			hotCurrentModuleData[moduleId] = data;
		}, this);
		outdatedModules.forEach(function(moduleId) {
			var module = installedModules[moduleId];
			if(!module) return;
			delete installedModules[moduleId];
			module.children.forEach(function(child) {
				child = installedModules[child];
				if(!child) return;
				var idx = child.parents.indexOf(moduleId);
				if(idx >= 0) child.parents.splice(idx, 1);
			}, this);
		});
		Object.keys(outdatedDependencies).forEach(function(moduleId) {
			var module = installedModules[moduleId];
			var moduleOutdatedDependencies = outdatedDependencies[moduleId];
			moduleOutdatedDependencies.forEach(function(dependency) {
				var idx = module.children.indexOf(dependency);
				if(idx >= 0) module.children.splice(idx, 1);
			});
		});

		hotSetStatus("apply");
		// insert new code
		Object.keys(hotUpdate).forEach(function(moduleId) {
			var fn = hotUpdate[moduleId];
			if(fn) modules[moduleId] = fn;
			else delete modules[moduleId];
		});

		// call accept handlers
		var error = null;
		Object.keys(outdatedDependencies).forEach(function(moduleId) {
			var module = installedModules[moduleId];
			var moduleOutdatedDependencies = outdatedDependencies[moduleId];
			var callbacks = [];
			moduleOutdatedDependencies.forEach(function(dependency) {
				var cb = module.hot._acceptedDependencies[dependency];
				if(callbacks.indexOf(cb) >= 0) return;
				callbacks.push(cb);
			});
			callbacks.forEach(function(cb) {
				try {
					cb(outdatedDependencies);
				} catch(err) {
					if(!error)
						error = err;
				}
			});
		});
		if(error) {
			hotSetStatus("fail");
			return callback(error);
		}

		// Load self accepted
		outdatedSelfAcceptedModules.forEach(function updateSelfAcceptedModules(moduleId) {
			hotCurrentParent = moduleId;
			$require$(moduleId);
		});

		hotCurrentHash = hotUpdateNewHash;

		hotSetStatus("idle");
		callback(null, outdatedModules);
	}
}.toString().replace(/^function\s?\(\)\s?\{\n?|\n?\}$/g, "").replace(/^\t/mg, "");