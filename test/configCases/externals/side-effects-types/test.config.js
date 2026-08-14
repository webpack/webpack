"use strict";

// the externals record themselves when evaluated: expression externals call
// `RECORD`, the `commonjs` family through the getters below
let evaluated = [];

const record = (name, exports) => {
	evaluated.push(name);
	return exports;
};

const modules = {};

for (const name of [
	"commonjs-free",
	"commonjs-keep",
	"commonjs2-free",
	"commonjs2-keep",
	"commonjs-module-free",
	"commonjs-module-keep",
	"commonjs-static-free",
	"commonjs-static-keep",
	"node-commonjs-free",
	"node-commonjs-keep",
	"dynamic-free"
]) {
	// a getter, so requiring the external is what records it
	Object.defineProperty(modules, name, {
		enumerable: true,
		get: () => record(name, {})
	});
}

module.exports = {
	modules,
	moduleScope(scope) {
		evaluated = [];
		scope.EVALUATED = evaluated;
		scope.RECORD = (name) => record(name, {});
	}
};
