/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// TODO remove in webpack 6
// Some old plugins use `require("webpack/lib/ModuleNotFoundError")`, in webpack@6 developer should migrate to `compiler.webpack.ModuleNotFoundError`
const __esmDefault =
	/** @type {typeof import("./errors/ModuleNotFoundError.js").default} */ (
		require("./errors/ModuleNotFoundError.js")
	);

export default __esmDefault;

export { __esmDefault as "module.exports" };
