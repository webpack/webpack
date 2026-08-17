"use strict";

module.exports = [
	[
		/dynamic imports: these 'import\(\)' calls load modules that are already in the initial chunk/,
		/\.\/index\.js .* imports \.\/shared\.js/,
		/\.\/nested\.js .* imports \.\/other\.js/
	]
];
