/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("./Template");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
var ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
var ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");
var RawSource = require("webpack-core/lib/RawSource");
var ConstDependency = require("./dependencies/ConstDependency");
var NullFactory = require("./NullFactory");

function HotModuleReplacementPlugin() {
}
module.exports = HotModuleReplacementPlugin;

HotModuleReplacementPlugin.prototype.apply = function(compiler) {
	var hotUpdateChunkFilename = compiler.options.output.hotUpdateChunkFilename;
	var hotUpdateMainFilename = compiler.options.output.hotUpdateMainFilename;
	compiler.plugin("compilation", function(compilation, params) {
		var hotUpdateChunkTemplate = compilation.hotUpdateChunkTemplate;
		if(!hotUpdateChunkTemplate) return;

		var normalModuleFactory = params.normalModuleFactory;
		var contextModuleFactory = params.contextModuleFactory;

		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

		compilation.dependencyFactories.set(ModuleHotAcceptDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ModuleHotAcceptDependency, new ModuleHotAcceptDependency.Template());

		compilation.dependencyFactories.set(ModuleHotDeclineDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ModuleHotDeclineDependency, new ModuleHotDeclineDependency.Template());

		compilation.plugin("record", function(compilation, records) {
			if(records.hash === this.hash) return;
			records.hash = compilation.hash;
			records.moduleHashs = {};
			this.modules.forEach(function(module) {
				var identifier = module.identifier();
				var hash = require("crypto").createHash("md5");
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
		compilation.plugin("after-hash", function() {
			var records = this.records;
			if(!records) return;
			var lastHash = records.hash || "x";
			var preHash = records.preHash || "x";
			var prepreHash = records.prepreHash || "x";
			if(preHash === this.hash) {
				this.modifyHash(prepreHash);
				return;
			}
			records.prepreHash = records.hash || "x";
			records.preHash = this.hash;
			this.modifyHash(records.prepreHash);
		});
		compilation.plugin("additional-chunk-assets", function() {
			var records = this.records;
			if(records.hash === this.hash) return;
			if(!records.moduleHashs || !records.chunkHashs || !records.chunkModuleIds) return;
			var moduleHashs = {};
			this.modules.forEach(function(module) {
				var identifier = module.identifier();
				var hash = require("crypto").createHash("md5");
				module.updateHash(hash);
				hash = hash.digest("hex");
				module.hotUpdate = records.moduleHashs[identifier] !== hash;
			});
			var hotUpdateMainContent = {
				h: this.hash,
				c: []
			};
			Object.keys(records.chunkHashs).forEach(function(chunkId) {
				chunkId = +chunkId;
				var currentChunk = this.chunks.filter(function(chunk) {
					return chunk.id === chunkId;
				})[0];
				if(currentChunk) {
					var newModules = currentChunk.modules.filter(function(module) {
						return module.hotUpdate;
					});
					if(newModules.length > 0) {
						var source = hotUpdateChunkTemplate.render(chunkId, newModules, this.hash, this.moduleTemplate, this.dependencyTemplates);
						var filename = this.getPath(hotUpdateChunkFilename, {
							hash: records.hash,
							chunk: currentChunk
						});
						this.additionalChunkAssets.push(filename);
						this.assets[filename] = source;
						hotUpdateMainContent.c.push(chunkId);
						currentChunk.files.push(filename);
						this.applyPlugins("chunk-asset", currentChunk, filename);
					}
				}
			}, this);
			var source = new RawSource(JSON.stringify(hotUpdateMainContent));
			var filename = this.getPath(hotUpdateMainFilename, {
				hash: records.hash
			});
			this.assets[filename] = source;
		});

		compilation.mainTemplate.plugin("hash", function(hash) {
			hash.update("HotMainTemplateDecorator");
		});

		compilation.mainTemplate.plugin("module-require", function(_, chunk, hash, varModuleId) {
			return "hotCreateRequire(" + varModuleId + ")";
		});

		compilation.mainTemplate.plugin("require-extensions", function(source, chunk, hash) {
			var buf = [source];
			buf.push("");
			buf.push("// __webpack_hash__");
			buf.push(this.requireFn + ".h = function() { return hotCurrentHash; };");
			return this.asString(buf);
		});

		compilation.mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
			source = this.applyPluginsWaterfall("hot-bootstrap", source, chunk, hash);
			return this.asString([
				source,
				"",
				hotInitCode
					.replace(/\$require\$/g, this.requireFn)
					.replace(/\$hash\$/g, JSON.stringify(hash))
					.replace(/\/\*foreachInstalledChunks\*\//g, chunk.chunks.length > 0 ? "for(var chunkId in installedChunks)" : "var chunkId = " + chunk.id +  ";")
			]);
		});

		compilation.mainTemplate.plugin("global-hash", function() {
			return true;
		});

		compilation.mainTemplate.plugin("current-hash", function(_, length) {
			if(isFinite(length))
				return "hotCurrentHash.substr(0, " + length + ")";
			else
				return "hotCurrentHash";
		});

		compilation.mainTemplate.plugin("module-obj", function(source, chunk, hash, varModuleId) {
			return this.asString([
				source + ",",
				"hot: hotCreateModule(" + varModuleId + "),",
				"parents: hotCurrentParents,",
				"children: []"
			]);
		});

	});
	compiler.parser.plugin("expression __webpack_hash__", function(expr) {
		var dep = new ConstDependency("__webpack_require__.h()", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("evaluate typeof __webpack_hash__", function(expr) {
		return new BasicEvaluatedExpression().setString("string").setRange(expr.range);
	});
	compiler.parser.plugin("evaluate Identifier module.hot", function(expr) {
		return new BasicEvaluatedExpression()
			.setBoolean(!!this.state.compilation.hotUpdateChunkTemplate)
			.setRange(expr.range);
	});
	compiler.parser.plugin("call module.hot.accept", function(expr) {
		if(!this.state.compilation.hotUpdateChunkTemplate) return false;
		if(expr.arguments.length > 1) {
			var arg = this.evaluateExpression(expr.arguments[0]);
			var params = [];
			if(arg.isString()) {
				params = [arg];
			}
			if(arg.isArray()){
				params = arg.items.filter(function(param) { 
					return param.isString();
				});
			}
			params.forEach(function(param){
				var dep = new ModuleHotAcceptDependency(param.string, param.range);
				dep.optional = true;
				this.state.module.addDependency(dep);
			}.bind(this));
		}
	});
	compiler.parser.plugin("call module.hot.decline", function(expr) {
		if(!this.state.compilation.hotUpdateChunkTemplate) return false;
		if(expr.arguments.length > 1) {
			var param = this.evaluateExpression(expr.arguments[0]);
			if(param.isString()) {
				var dep = new ModuleHotDeclineDependency(param.string, param.range);
				dep.optional = true;
				this.state.module.addDependency(dep);
			}
		}
	});
	compiler.parser.plugin("expression module.hot", function() {
		return true;
	});
};

var hotInitCode = Template.getFunctionContent(function() {

	var hotApplyOnUpdate = true;
	var hotCurrentHash = $hash$;
	var hotCurrentModuleData = {};
	var hotCurrentParents = [];

	function hotCreateRequire(moduleId) {
		var me = installedModules[moduleId];
		if(!me) return $require$;
		var fn = function(request) {
			if(me.hot.active) {
				if(installedModules[request]) {
					if(installedModules[request].parents.indexOf(moduleId) < 0)
						installedModules[request].parents.push(moduleId);
					if(me.children.indexOf(request) < 0)
						me.children.push(request);
				} else hotCurrentParents = [moduleId];
			} else {
				console.warn("[HMR] unexpected require(" + request + ") from disposed module " + moduleId);
				hotCurrentParents = [];
			}
			return $require$(request);
		};
		for(var name in $require$) {
			if(Object.prototype.hasOwnProperty.call($require$, name)) {
				fn[name] = $require$[name];
			}
		}
		fn.e = function(chunkId, callback) {
			if(hotStatus === "ready")
				hotSetStatus("prepare");
			hotChunksLoading++;
			$require$.e(chunkId, function() {
				try {
					callback.call(null, fn);
				} finally {
					finishChunkLoading();
				}
				function finishChunkLoading() {
					hotChunksLoading--;
					if(hotStatus === "prepare") {
						if(!hotWaitingFilesMap[chunkId]) {
							hotEnsureUpdateChunk(chunkId);
						}
						if(hotChunksLoading === 0 && hotWaitingFiles === 0) {
							hotUpdateDownloaded();
						}
					}
				}
			});
		}
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
			active: true,
			accept: function(dep, callback) {
				if(typeof dep === "undefined")
					hot._selfAccepted = true;
				else if(typeof dep === "function")
					hot._selfAccepted = dep;
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
			removeStatusHandler: function(l) {
				var idx = hotStatusHandlers.indexOf(l);
				if(idx >= 0) hotStatusHandlers.splice(idx, 1);
			},

			//inherit from previous dispose call
			data: hotCurrentModuleData[moduleId]
		};
		return hot;
	}

	var hotStatusHandlers = [];
	var hotStatus = "idle";

	function hotSetStatus(newStatus) {
		hotStatus = newStatus;
		for(var i = 0; i < hotStatusHandlers.length; i++)
			hotStatusHandlers[i].call(null, newStatus);
	}

	// while downloading
	var hotWaitingFiles = 0;
	var hotChunksLoading = 0;
	var hotWaitingFilesMap = {};
	var hotRequestedFilesMap = {};
	var hotAvailibleFilesMap = {};
	var hotCallback;

	// The update info
	var hotUpdate, hotUpdateNewHash;

	function hotCheck(apply, callback) {
		if(hotStatus !== "idle") throw new Error("check() is only allowed in idle status");
		if(typeof apply === "function") {
			hotApplyOnUpdate = false;
			callback = apply;
		} else {
			hotApplyOnUpdate = apply;
			callback = callback || function(err) { if(err) throw err };
		}
		hotSetStatus("check");
		hotDownloadManifest(function(err, update) {
			if(err) return callback(err);
			if(!update) {
				hotSetStatus("idle");
				callback(null, null);
				return;
			}

			hotRequestedFilesMap = {};
			hotAvailibleFilesMap = {};
			hotWaitingFilesMap = {};
			for(var i = 0; i < update.c.length; i++)
				hotAvailibleFilesMap[update.c[i]] = true;
			hotUpdateNewHash = update.h;

			hotSetStatus("prepare");
			hotCallback = callback;
			hotUpdate = {};
			/*foreachInstalledChunks*/ {
				hotEnsureUpdateChunk(chunkId);
			}
			if(hotStatus === "prepare" && hotChunksLoading === 0 && hotWaitingFiles === 0) {
				hotUpdateDownloaded();
			}
		});
	}

	function hotAddUpdateChunk(chunkId, moreModules) {
		if(!hotAvailibleFilesMap[chunkId] || !hotRequestedFilesMap[chunkId])
			return;
		hotRequestedFilesMap[chunkId] = false;
		for(var moduleId in moreModules) {
			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
				hotUpdate[moduleId] = moreModules[moduleId];
			}
		}
		if(--hotWaitingFiles === 0 && hotChunksLoading === 0) {
			hotUpdateDownloaded();
		}
	}

	function hotEnsureUpdateChunk(chunkId) {
		if(!hotAvailibleFilesMap[chunkId]) {
			hotWaitingFilesMap[chunkId] = true;
		} else {
			hotRequestedFilesMap[chunkId] = true;
			hotWaitingFiles++;
			hotDownloadUpdateChunk(chunkId);
		}
	}

	function hotUpdateDownloaded() {
		hotSetStatus("ready");
		var callback = hotCallback;
		hotCallback = null;
		if(!callback) return;
		if(hotApplyOnUpdate) {
			hotApply(hotApplyOnUpdate, callback);
		} else {
			var outdatedModules = [];
			for(var id in hotUpdate) {
				if(Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
					outdatedModules.push(+id);
				}
			}
			callback(null, outdatedModules);
		}
	}

	function hotApply(options, callback) {
		if(hotStatus !== "ready") throw new Error("apply() is only allowed in ready status");
		if(typeof options === "function") {
			callback = options;
			options = {};
		} else if(options && typeof options === "object") {
			callback = callback || function(err) { if(err) throw err };
		} else {
			options = {};
			callback = callback || function(err) { if(err) throw err };
		}
		
		function getAffectedStuff(module) {
			var outdatedModules = [module];
			var outdatedDependencies = {};
			
			var queue = outdatedModules.slice();
			while(queue.length > 0) {
				var moduleId = queue.pop();
				var module = installedModules[moduleId];
				if(!module || module.hot._selfAccepted)
					continue;
				if(module.hot._selfDeclined) {
					return new Error("Aborted because of self decline: " + moduleId);
				}
				if(moduleId === 0) {
					return;
				}
				for(var i = 0; i < module.parents.length; i++) {
					var parentId = module.parents[i];
					var parent = installedModules[parentId];
					if(parent.hot._declinedDependencies[moduleId]) {
						return new Error("Aborted because of declined dependency: " + moduleId + " in " + parentId);
					}
					if(outdatedModules.indexOf(parentId) >= 0) continue;
					if(parent.hot._acceptedDependencies[moduleId]) {
						if(!outdatedDependencies[parentId])
							outdatedDependencies[parentId] = [];
						addAllToSet(outdatedDependencies[parentId], [moduleId]);
						continue;
					}
					delete outdatedDependencies[parentId];
					outdatedModules.push(parentId);
					queue.push(parentId);
				}
			}
			
			return [outdatedModules, outdatedDependencies];
		}
		function addAllToSet(a, b) {
			for(var i = 0; i < b.length; i++) {
				var item = b[i];
				if(a.indexOf(item) < 0)
					a.push(item);
			}
		}

		// at begin all updates modules are outdated
		// the "outdated" status can propagate to parents if they don't accept the children
		var outdatedDependencies = {};
		var outdatedModules = [];
		var appliedUpdate = {};
		for(var id in hotUpdate) {
			if(Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
				var moduleId = +id;
				var result = getAffectedStuff(moduleId);
				if(!result) {
					if(options.ignoreUnaccepted)
						continue;
					hotSetStatus("abort");
					return callback(new Error("Aborted because " + moduleId + " is not accepted"));
				}
				if(result instanceof Error) {
					hotSetStatus("abort");
					return callback(result);
				}
				appliedUpdate[moduleId] = hotUpdate[moduleId];
				addAllToSet(outdatedModules, result[0]);
				for(var moduleId in result[1]) {
					if(Object.prototype.hasOwnProperty.call(result[1], moduleId)) {
						if(!outdatedDependencies[moduleId])
							outdatedDependencies[moduleId] = [];
						addAllToSet(outdatedDependencies[moduleId], result[1][moduleId]);
					}
				}
			}
		}

		// Store self accepted outdated modules to require them later by the module system
		var outdatedSelfAcceptedModules = [];
		for(var i = 0; i < outdatedModules.length; i++) {
			var moduleId = outdatedModules[i];
			if(installedModules[moduleId] && installedModules[moduleId].hot._selfAccepted)
				outdatedSelfAcceptedModules.push({
					module: moduleId,
					errorHandler: installedModules[moduleId].hot._selfAccepted
				});
		}

		// Now in "dispose" phase
		hotSetStatus("dispose");
		var queue = outdatedModules.slice();
		while(queue.length > 0) {
			var moduleId = queue.pop();
			var module = installedModules[moduleId];
			if(!module) continue;

			var data = {};

			// Call dispose handlers
			var disposeHandlers = module.hot._disposeHandlers;
			for(var j = 0; j < disposeHandlers.length; j++) {
				var cb = disposeHandlers[j]
				cb(data);
			}
			hotCurrentModuleData[moduleId] = data;

			// disable module (this disables requires from this module)
			module.hot.active = false;

			// remove module from cache
			delete installedModules[moduleId];

			// remove "parents" references from all children
			for(var j = 0; j < module.children.length; j++) {
				var child = installedModules[module.children[j]];
				if(!child) continue;
				var idx = child.parents.indexOf(moduleId);
				if(idx >= 0) {
					child.parents.splice(idx, 1);
				}
			}
		}

		// remove outdated dependency from module children
		for(var moduleId in outdatedDependencies) {
			if(Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
				var module = installedModules[moduleId];
				var moduleOutdatedDependencies = outdatedDependencies[moduleId];
				for(var j = 0; j < moduleOutdatedDependencies.length; j++) {
					var dependency = moduleOutdatedDependencies[j];
					var idx = module.children.indexOf(dependency);
					if(idx >= 0) module.children.splice(idx, 1);
				}
			}
		}

		// Not in "apply" phase
		hotSetStatus("apply");

		hotCurrentHash = hotUpdateNewHash;

		// insert new code
		for(var moduleId in appliedUpdate) {
			if(Object.prototype.hasOwnProperty.call(appliedUpdate, moduleId)) {
				modules[moduleId] = appliedUpdate[moduleId];
			}
		}

		// call accept handlers
		var error = null;
		for(var moduleId in outdatedDependencies) {
			if(Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
				var module = installedModules[moduleId];
				var moduleOutdatedDependencies = outdatedDependencies[moduleId];
				var callbacks = [];
				for(var i = 0; i < moduleOutdatedDependencies.length; i++) {
					var dependency = moduleOutdatedDependencies[i];
					var cb = module.hot._acceptedDependencies[dependency];
					if(callbacks.indexOf(cb) >= 0) continue;
					callbacks.push(cb);
				}
				for(var i = 0; i < callbacks.length; i++) {
					var cb = callbacks[i];
					try {
						cb(outdatedDependencies);
					} catch(err) {
						if(!error)
							error = err;
					}
				}
			}
		}

		// Load self accepted modules
		for(var i = 0; i < outdatedSelfAcceptedModules.length; i++) {
			var item = outdatedSelfAcceptedModules[i];
			var moduleId = item.module;
			hotCurrentParents = [moduleId];
			try {
				$require$(moduleId);
			} catch(err) {
				if(typeof item.errorHandler === "function") {
					try {
						item.errorHandler(err);
					} catch(err) {
						if(!error)
							error = err;
					}
				} else if(!error)
					error = err;
			}
		}

		// handle errors in accept handlers and self accepted module load
		if(error) {
			hotSetStatus("fail");
			return callback(error);
		}

		hotSetStatus("idle");
		callback(null, outdatedModules);
	}
});
