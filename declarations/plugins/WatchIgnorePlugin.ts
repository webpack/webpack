/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

/**
 * @schema
 */
export interface WatchIgnorePluginOptions {
	/**
	 * A list of RegExps or absolute paths to directories or files that should be ignored.
	 * @minItems 1
	 */
	paths: Array<
		| /** RegExp or absolute path to directories or files that should be ignored. */ RegExp
		| string
	>;
}
