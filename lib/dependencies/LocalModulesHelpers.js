/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var LocalModule = require("./LocalModule");

var LocalModulesHelpers = exports;

LocalModulesHelpers.addLocalModule = function(state, name) {
	if(!state.localModules) state.localModules = [];
	var m = new LocalModule(state.module, name, state.localModules.length);
	state.localModules.push(m);
	return m;
};

LocalModulesHelpers.getLocalModule = function(state, name) {
	if(!state.localModules) return null;
	for(var i = 0; i < state.localModules.length; i++) {
		if(state.localModules[i].name === name)
			return state.localModules[i];
	}
	return null;
};
