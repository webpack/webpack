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

LocalModulesHelpers.getLocalModule = function(state, name, namedModule) {
	if(!state.localModules) return null;
	if(namedModule) {
		// resolve dependency name relative to the defining named module
		name = lookup(namedModule, name);
	}
	for(var i = 0; i < state.localModules.length; i++) {
		if(state.localModules[i].name === name)
			return state.localModules[i];
	}
	return null;
};

function lookup(parent, mod) {
	if ('.' != mod.charAt(0)) return mod;

	var path = parent.split('/')
		, segs = mod.split('/');
	path.pop();

	for (var i = 0; i < segs.length; i++) {
		var seg = segs[i];
		if ('..' == seg) path.pop();
		else if ('.' != seg) path.push(seg);
	}

	return path.join('/');
}

