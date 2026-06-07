"use strict";

module.exports = [
	// ObjectMiddleware, loader-runner, jest-worker, minimizer-webpack-plugin/utils.js
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
	/Can't resolve '@swc\/core\/package\.json'/,
	/Can't resolve 'esbuild'/,
	/Can't resolve 'esbuild\/package\.json'/,
	/Can't resolve '@minify-html\/node'/,
	/Can't resolve '@minify-html\/node\/package\.json'/,
	/Can't resolve '@swc\/html'/,
	/Can't resolve '@swc\/html\/package\.json'/,
	/Can't resolve 'cssnano'/,
	/Can't resolve 'cssnano\/package\.json'/,
	/Can't resolve 'csso'/,
	/Can't resolve 'csso\/package\.json'/,
	/Can't resolve 'lightningcss'/,
	/Can't resolve 'lightningcss\/package\.json'/,
	/Can't resolve '@swc\/css'/,
	/Can't resolve '@swc\/css\/package\.json'/
];
