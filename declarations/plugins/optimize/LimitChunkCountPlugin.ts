/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type PositiveNumber } from "../../vocabulary";

/**
 * @schema
 */
export interface LimitChunkCountPluginOptions {
	/**
	 * Constant overhead for a chunk.
	 */
	chunkOverhead?: number;
	/**
	 * Multiplicator for initial chunks.
	 */
	entryChunkMultiplicator?: number;
	/**
	 * Limit the maximum number of chunks using a value greater than or equal to 1.
	 */
	maxChunks: PositiveNumber;
}
