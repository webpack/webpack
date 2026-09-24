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
export interface MergeDuplicateChunksPluginOptions {
	/**
	 * Specifies the stage for merging duplicate chunks.
	 */
	stage?: number;
}
