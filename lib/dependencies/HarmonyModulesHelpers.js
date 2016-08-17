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

// checks if an harmory dependency is active in a module according to
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
HarmonyModulesHelpers.getActiveExports = function(module) {
	if(module.activeExports)
		return module.activeExports;
	return module.dependencies.reduce(function(arr, dep) {
		if(!dep.describeHarmonyExport) return arr;
		var d = dep.describeHarmonyExport();
		if(!d) return arr;
		var name = d.exportedName;
		if(!name || arr.indexOf(name) >= 0) return arr;
		arr.push(name);
		return arr;
	}, [])
};

HarmonyModulesHelpers.hasStarExport = function(module) {
	if(typeof module.hasStarExport === "boolean")
		return module.hasStarExport;
	return module.dependencies.some(function(dep) {
		if(!dep.describeHarmonyExport) return false;
		var d = dep.describeHarmonyExport();
		if(!d) return false;
		var name = d.exportedName;
		return !name;
	}, [])
};

HarmonyModulesHelpers.isExportedByHarmony = function(module, exportedName) {
	if(module.hasStarExport)
		return exportedName !== "default";
	if(module.activeExports && module.activeExports.indexOf(exportedName) >= 0)
		return true;
	if(module.activeExports && typeof module.hasStarExport === "boolean")
		return false;
	return module.dependencies.some(function(dep) {
		if(!dep.describeHarmonyExport) return false;
		var d = dep.describeHarmonyExport();
		if(!d) return false;
		var name = d.exportedName;
		if(!name) return exportedName !== "default"; // namespace export
		return name === exportedName; // direct export
	}, [])
};
