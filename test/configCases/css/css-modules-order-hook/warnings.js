"use strict";

module.exports = [
	[
		// Only the "fallback" config (which returns undefined from orderModules)
		// keeps the default topological merge and therefore emits this warning.
		/Conflicting order between css \.\/b\.css and css \.\/c\.css\nCSS modules are imported in:\n {2}- css \.\/lazy1\.css\n {2}- css \.\/lazy2\.css/
	]
];
