"use strict";

module.exports = [
	[
		/a module library may export a stale binding, since the module calls eval\(\), and a write made inside it is not seen\n {4}\.\/evaluated\.js/
	]
];
