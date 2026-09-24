/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyString } from "../../vocabulary";

/**
 * @schema
 */
export interface DllPluginOptions {
	/**
	 * Context of requests in the manifest file (defaults to the webpack context).
	 */
	context?: NonEmptyString;
	/**
	 * If true, only entry points will be exposed (default: true).
	 */
	entryOnly?: boolean;
	/**
	 * If true, manifest json file (output) will be formatted.
	 */
	format?: boolean;
	/**
	 * Name of the exposed dll function (external name, use value of 'output.library').
	 */
	name?: NonEmptyString;
	/**
	 * Absolute path to the manifest json file (output).
	 */
	path: NonEmptyString;
	/**
	 * Type of the dll bundle (external type, use value of 'output.libraryTarget').
	 */
	type?: NonEmptyString;
}
