"use strict";

/**
 * Webpack global variables for ESLint configuration.
 *
 * This export provides webpack's global identifiers in the same format
 * as the `globals` package (https://github.com/sindresorhus/globals).
 *
 * Each global is given a value of `true` (writable) or `false` (read-only).
 * Variables declared with `var` are writable, `const` are read-only.
 * @example
 * // eslint.config.js (flat config)
 * import webpackGlobals from "webpack/globals";
 *
 * export default [
 *   {
 *     languageOptions: {
 *       globals: webpackGlobals
 *     }
 *   }
 * ];
 * @example
 * // .eslintrc.js (legacy config)
 * const webpackGlobals = require("webpack/globals");
 *
 * module.exports = {
 *   globals: webpackGlobals
 * };
 */
module.exports = {
	// The resource query of the current module
	__resourceQuery: false,

	// The public path as configured via output.publicPath
	__webpack_public_path__: true,

	// The nonce for script tags
	__webpack_nonce__: true,

	// The name of the current chunk
	__webpack_chunkname__: false,

	// The base URI for resolving relative URLs
	__webpack_base_uri__: true,

	// The runtime id of the current runtime
	__webpack_runtime_id__: true,

	// The compilation hash
	__webpack_hash__: false,

	// An object containing all modules
	__webpack_modules__: false,

	// The raw require function
	__webpack_require__: false,

	// Function to load a chunk
	__webpack_chunk_load__: true,

	// Function to get the filename for a chunk
	__webpack_get_script_filename__: true,

	// Function to check if a module is included
	__webpack_is_included__: true,

	// Information about exports
	__webpack_exports_info__: true,

	// Share scopes for Module Federation
	__webpack_share_scopes__: false,

	// Function to initialize sharing
	__webpack_init_sharing__: true,

	// Access to native require (bypassing webpack)
	__non_webpack_require__: true,

	// The System.js context object
	__system_context__: false
};
