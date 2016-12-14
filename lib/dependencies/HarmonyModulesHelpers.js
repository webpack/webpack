/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var HarmonyModulesHelpers = exports;

HarmonyModulesHelpers.getModuleVar = function(state, request) {
	if(!state.harmonyModules) state.harmonyModules = [];
	var idx = state.harmonyModules.indexOf(request);
	if(idx < 0) {
		idx = state.harmonyModules.length;
		state.harmonyModules.push(request);
	}
	return "__WEBPACK_IMPORTED_MODULE_" + idx + "_" + request.replace(/[^A-Za-z0-9_]/g, "_").replace(/__+/g, "_") + "__";
};

HarmonyModulesHelpers.getNewModuleVar = function(state, request) {
	if(state.harmonyModules && state.harmonyModules.indexOf(request) >= 0)
		return null;
	return HarmonyModulesHelpers.getModuleVar(state, request);
};

HarmonyModulesHelpers.checkModuleVar = function(state, request) {
	if(!state.harmonyModules || state.harmonyModules.indexOf(request) < 0)
		return null;
	return HarmonyModulesHelpers.getModuleVar(state, request);
};

// checks if an harmony dependency is active in a module according to
// precedence rules.
HarmonyModulesHelpers.isActive = function(module, depInQuestion) {
	var desc = depInQuestion.describeHarmonyExport();
	if(!desc.exportedName) return true;
	var before = true;
	for(var i = 0; i < module.dependencies.length; i++) {
		var dep = module.dependencies[i];
		if(dep === depInQuestion) {
			before = false;
			continue;
		}
		if(!dep.describeHarmonyExport) continue;
		var d = dep.describeHarmonyExport();
		if(!d || !d.exportedName) continue;
		if(d.exportedName === desc.exportedName) {
			if(d.precedence < desc.precedence) {
				return false;
			}
			if(d.precedence === desc.precedence && !before) {
				return false;
			}
		}
	}
	return true;
};

// get a list of named exports defined in a module
// doesn't include * reexports.
HarmonyModulesHelpers.getActiveExports = function(module, currentDependency) {
	var desc = currentDependency && currentDependency.describeHarmonyExport();
	var currentIndex = currentDependency ? module.dependencies.indexOf(currentDependency) : -1;
	return module.dependencies.map(function(dep, idx) {
		return {
			dep: dep,
			idx: idx
		}
	}).reduce(function(arr, data) {
		var dep = data.dep;
		if(!dep.describeHarmonyExport) return arr;
		var d = dep.describeHarmonyExport();
		if(!d) return arr;
		if(!desc || (d.precedence < desc.precedence) || (d.precedence === desc.precedence && data.idx < currentIndex)) {
			var names = [].concat(d.exportedName);
			names.forEach(function(name) {
				if(name && arr.indexOf(name) < 0)
					arr.push(name);
			});
		}
		return arr;
	}, []);
};
