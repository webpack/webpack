"use strict";

module.exports = [
	[
		/There is a circular build dependency/,
		/Circular dependency detected/,
		/Circular dependency chain:/,
		/\s*→ .*moduleA\.js/,
		/\s*→ .*moduleB\.js/,
		/\s*↻ .*moduleA\.js/,
		/To fix this circular dependency:/,
		/- Extract shared code from .*moduleA\.js and .*moduleB\.js to a separate module/,
		/- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)/,
		/- Consider refactoring the module structure to remove the dependency cycle/
	]
];

