"use strict";

module.exports = [
	[
		/dynamic imports: these 'import\(\)' calls target modules already loaded where they run/,
		/\.\/index\.js .* imports \.\/shared\.js/,
		/\.\/nested\.js .* imports \.\/other\.js/
	]
];
