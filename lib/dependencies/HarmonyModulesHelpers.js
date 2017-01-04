"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
function getModuleVar(state, request) {
	if(!state.harmonyModules) {
		state.harmonyModules = [];
	}
	let idx = state.harmonyModules.indexOf(request);
	if(idx < 0) {
		idx = state.harmonyModules.length;
		state.harmonyModules.push(request);
	}
	return `__WEBPACK_IMPORTED_MODULE_${idx}_${request.replace(/[^A-Za-z0-9_]/g, "_").replace(/__+/g, "_")}__`;
}
exports.getModuleVar = getModuleVar;
function getNewModuleVar(state, request) {
	if(state.harmonyModules && state.harmonyModules.indexOf(request) >= 0) {
		return null;
	}
	return getModuleVar(state, request);
}
exports.getNewModuleVar = getNewModuleVar;
function checkModuleVar(state, request) {
	if(!state.harmonyModules || state.harmonyModules.indexOf(request) < 0) {
		return null;
	}
	return getModuleVar(state, request);
}
exports.checkModuleVar = checkModuleVar;
// checks if an harmony dependency is active in a module according to
// precedence rules.
function isActive(module, depInQuestion) {
	const desc = depInQuestion.describeHarmonyExport();
	if(!desc.exportedName) {
		return true;
	}
	let before = true;
	for(let i = 0; i < module.dependencies.length; i++) {
		const dep = module.dependencies[i];
		if(dep === depInQuestion) {
			before = false;
			continue;
		}
		if(!dep.describeHarmonyExport) {
			continue;
		}
		const d = dep.describeHarmonyExport();
		if(!d || !d.exportedName) {
			continue;
		}
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
exports.isActive = isActive;
// get a list of named exports defined in a module
// doesn't include * reexports.
function getActiveExports(module, currentDependency) {
	const desc = currentDependency && currentDependency.describeHarmonyExport();
	const currentIndex = currentDependency ? module.dependencies.indexOf(currentDependency) : -1;
	return module.dependencies.map(function(dep, idx) {
		return {
			dep: dep,
			idx: idx
		};
	}).reduce(function(arr, data) {
		const dep = data.dep;
		if(!dep.describeHarmonyExport) {
			return arr;
		}
		const d = dep.describeHarmonyExport();
		if(!d) {
			return arr;
		}
		if(!desc
			|| (d.precedence < desc.precedence)
			|| (d.precedence === desc.precedence && data.idx < currentIndex)) {
			const names = [].concat(d.exportedName);
			names.forEach(function(name) {
				if(name && arr.indexOf(name) < 0) {
					arr.push(name);
				}
			});
		}
		return arr;
	}, []);
}
exports.getActiveExports = getActiveExports;
