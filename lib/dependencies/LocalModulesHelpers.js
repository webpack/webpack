/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const LocalModule = require("./LocalModule");

const lookup = (parent, mod) => {
	if (mod.charAt(0) !== ".") return mod;

	var path = parent.split("/");
	var segments = mod.split("/");
	path.pop();

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		if (seg === "..") {
			path.pop();
		} else if (seg !== ".") {
			path.push(seg);
		}
	}

	return path.join("/");
};

exports.addLocalModule = (state, name) => {
	if (!state.localModules) {
		state.localModules = [];
	}
	const m = new LocalModule(name, state.localModules.length);
	state.localModules.push(m);
	return m;
};

exports.getLocalModule = (state, name, namedModule) => {
	if (!state.localModules) return null;
	if (namedModule) {
		// resolve dependency name relative to the defining named module
		name = lookup(namedModule, name);
	}
	for (let i = 0; i < state.localModules.length; i++) {
		if (state.localModules[i].name === name) {
			return state.localModules[i];
		}
	}
	return null;
};
