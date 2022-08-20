/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Algorithm used for generation the hash (see node.js crypto package).
 */
export type HashFunction = string | typeof import("../../lib/util/Hash");

export interface HashedModuleIdsPluginOptions {
	/**
	 * The context directory for creating names.
	 */
	context?: string;
	/**
	 * The encoding to use when generating the hash, defaults to 'base64'. All encodings from Node.JS' hash.digest are supported.
	 */
	hashDigest?: "hex" | "latin1" | "base64";
	/**
	 * The prefix length of the hash digest to use, defaults to 4.
	 */
	hashDigestLength?: number;
	/**
	 * The hashing algorithm to use, defaults to 'md4'. All functions from Node.JS' crypto.createHash are supported.
	 */
	hashFunction?: HashFunction;
}
