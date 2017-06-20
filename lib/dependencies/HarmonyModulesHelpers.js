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

	// checks if an harmony dependency is active in a module according to
	// precedence rules.
	static isActive(module, depInQuestion) {
		const desc = depInQuestion.describeHarmonyExport();
		if(!desc.exportedName) return true;
		let before = true;
		for(const moduleDependency of module.dependencies) {
			const dep = moduleDependency;
			if(dep === depInQuestion) {
				before = false;
				continue;
			}
			if(!dep.describeHarmonyExport) continue;
			const d = dep.describeHarmonyExport();
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
	}

	// get a list of named exports defined in a module
	// doesn't include * reexports.
	static getActiveExports(module, currentDependency) {
		const desc = currentDependency && currentDependency.describeHarmonyExport();
		var currentIndex = currentDependency ? module.dependencies.indexOf(currentDependency) : -1;
		return module.dependencies.map((dep, idx) => {
			return {
				dep: dep,
				idx: idx
			};
		}).reduce((arr, data) => {
			const dep = data.dep;
			if(!dep.describeHarmonyExport) return arr;
			const d = dep.describeHarmonyExport();
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
	}
}

module.exports = HarmonyModulesHelpers;
