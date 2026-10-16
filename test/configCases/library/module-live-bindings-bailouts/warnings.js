"use strict";

module.exports = [
	[
		/a module library exports its bindings as copies read once, since another chunk of the runtime runs the module, without the declaration\n {4}\.\/shared\.js\n {2}a module library exports its bindings as copies read once, since the module calls eval\(\), which reads a binding by the name it was declared with\n {4}\.\/evaluated\.js/
	]
];
