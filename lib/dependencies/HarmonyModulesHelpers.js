/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class HarmonyModulesHelpers {

	static getModuleVar(state, request) {
		if(!state.harmonyModules) state.harmonyModules = [];
		let idx = state.harmonyModules.indexOf(request);
		if(idx < 0) {
			idx = state.harmonyModules.length;
			state.harmonyModules.push(request);
		}
		return `__WEBPACK_IMPORTED_MODULE_${idx}_${request.replace(/[^A-Za-z0-9_]/g, "_").replace(/__+/g, "_")}__`;
	}

	static getNewModuleVar(state, request) {
		if(state.harmonyModules && state.harmonyModules.indexOf(request) >= 0)
			return null;
		return this.getModuleVar(state, request);
	}

	static checkModuleVar(state, request) {
		if(!state.harmonyModules || state.harmonyModules.indexOf(request) < 0)
			return null;
		return this.getModuleVar(state, request);
	}
}

module.exports = HarmonyModulesHelpers;
