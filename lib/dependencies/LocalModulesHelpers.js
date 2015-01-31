/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require('path')
var LocalModule = require("./LocalModule");

var LocalModulesHelpers = exports;

LocalModulesHelpers.addLocalModule = function(state, name) {
	if(!state.localModules) state.localModules = [];
	var m = new LocalModule(state.module, name, state.localModules.length);
	state.localModules.push(m);
	return m;
};

LocalModulesHelpers.getLocalModule = function(state, name, namedModule) {
	if(!state.localModules) return null;
	if(namedModule && isRelative(name)) {
		// resolve dependency name relative to the defining named module
		name = path.join(path.dirname(namedModule), name);
	}
	for(var i = 0; i < state.localModules.length; i++) {
		if(state.localModules[i].name === name)
			return state.localModules[i];
	}
	return null;
};

function isRelative(name) {
  return name[0] === '.';
}
