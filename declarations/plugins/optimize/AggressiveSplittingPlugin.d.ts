/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export interface AggressiveSplittingPluginOptions {
	/**
	 * Extra cost for each chunk (Default: 9.8kiB).
	 */
	chunkOverhead?: number;
	/**
	 * Extra cost multiplicator for entry chunks (Default: 10).
	 */
	entryChunkMultiplicator?: number;
	/**
	 * Byte, max size of per file (Default: 50kiB).
	 */
	maxSize?: number;
	/**
	 * Byte, split point. (Default: 30kiB).
	 */
	minSize?: number;
}
