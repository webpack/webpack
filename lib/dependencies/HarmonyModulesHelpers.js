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
}
