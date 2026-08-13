"use strict";

let evaluated = [];

const record = (name) => {
	evaluated.push(name);
	return {};
};

const modules = {};

for (const name of [
	"module-free",
	"module-keep",
	"module-import-free",
	"module-import-keep"
]) {
	// a getter, so importing the external is what records it
	Object.defineProperty(modules, name, {
		enumerable: true,
		get: () => record(name)
	});
}

module.exports = {
	modules,
	moduleScope(scope) {
		evaluated = [];
		scope.EVALUATED = evaluated;
	}
};
