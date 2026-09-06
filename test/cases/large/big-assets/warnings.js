"use strict";

module.exports = [
	// ObjectMiddleware, loader-runner, jest-worker, minimizer-webpack-plugin/utils.js
	// and the two dynamic requires of the jest-worker child the plugin nests
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	/Critical dependency: the request of a dependency is an expression/,
	// minimizer-webpack-plugin/minify.js
	/Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
	// Optional dependencies of minimizer-webpack-plugin
	/Can't resolve '@swc\/core'/,
	/Can't resolve 'esbuild'/,
	/Can't resolve '@minify-html\/node'/,
	/Can't resolve '@swc\/html'/,
	/Can't resolve 'cssnano'/,
	/Can't resolve 'csso'/,
	/Can't resolve 'lightningcss'/,
	/Can't resolve '@swc\/css'/
];
