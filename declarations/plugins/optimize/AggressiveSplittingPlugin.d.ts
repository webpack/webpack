/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export interface AggressiveSplittingPlugin {
	/**
	 * Byte, split point. Default: 30720
	 */
	minSize?: number;
	/**
	 * Byte, maxsize of per file. Default: 51200
	 */
	maxSize?: number;
	/**
	 * Default: 0
	 */
	chunkOverhead?: number;
	/**
	 * Default: 1
	 */
	entryChunkMultiplicator?: number;
}
