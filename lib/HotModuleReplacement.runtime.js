/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*global $hash$ installedModules $require$ hotDownloadManifest hotDownloadUpdateChunk modules */
module.exports = function() {

	var hotApplyOnUpdate = true;
	var hotCurrentHash = $hash$; // eslint-disable-line no-unused-vars
	var hotCurrentModuleData = {};
	var hotCurrentParents = []; // eslint-disable-line no-unused-vars

	function hotCreateRequire(moduleId) { // eslint-disable-line no-unused-vars
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
				Object.defineProperty(fn, name, (function(name) {
					return {
						configurable: true,
						enumerable: true,
						get: function() {
							return $require$[name];
						},
						set: function(value) {
							$require$[name] = value;
						}
					};
				}(name)));
			}
		}
		Object.defineProperty(fn, "e", {
			enumerable: true,
			value: function(chunkId, callback) {
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
		});
		return fn;
	}

	function hotCreateModule(moduleId) { // eslint-disable-line no-unused-vars
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
				else if(typeof dep === "object")
					for(var i = 0; i < dep.length; i++)
						hot._acceptedDependencies[dep[i]] = callback;
				else
					hot._acceptedDependencies[dep] = callback;
			},
			decline: function(dep) {
				if(typeof dep === "undefined")
					hot._selfDeclined = true;
				else if(typeof dep === "number")
					hot._declinedDependencies[dep] = true;
				else
					for(var i = 0; i < dep.length; i++)
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

	function toModuleId(id) {
		var isNumber = (+id) + "" === id;
		return isNumber ? +id : id;
	}

	function hotCheck(apply, callback) {
		if(hotStatus !== "idle") throw new Error("check() is only allowed in idle status");
		if(typeof apply === "function") {
			hotApplyOnUpdate = false;
			callback = apply;
		} else {
			hotApplyOnUpdate = apply;
			callback = callback || function(err) {
				if(err) throw err;
			};
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
			/*foreachInstalledChunks*/
			{ // eslint-disable-line no-lone-blocks
				/*globals chunkId */
				hotEnsureUpdateChunk(chunkId);
			}
			if(hotStatus === "prepare" && hotChunksLoading === 0 && hotWaitingFiles === 0) {
				hotUpdateDownloaded();
			}
		});
	}

	function hotAddUpdateChunk(chunkId, moreModules) { // eslint-disable-line no-unused-vars
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
					outdatedModules.push(toModuleId(id));
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
			callback = callback || function(err) {
				if(err) throw err;
			};
		} else {
			options = {};
			callback = callback || function(err) {
				if(err) throw err;
			};
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
				var moduleId = toModuleId(id);
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
				var cb = disposeHandlers[j];
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
};
