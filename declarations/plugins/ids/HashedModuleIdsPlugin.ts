/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import {
	type AbsolutePath,
	type NonEmptyString,
	type PositiveNumber
} from "../../vocabulary";

/**
 * Algorithm used for generation the hash (see node.js crypto package).
 */
export type HashFunction =
	NonEmptyString | typeof import("../../../lib/util/Hash");

/**
 * @schema
 */
export interface HashedModuleIdsPluginOptions {
	/**
	 * The context directory for creating names.
	 */
	context?: AbsolutePath;
	/**
	 * The encoding to use when generating the hash, defaults to 'base64'. All encodings from Node.JS' hash.digest are supported.
	 */
	hashDigest?:
		| "base64"
		| "base64url"
		| "hex"
		| "binary"
		| "utf8"
		| "utf-8"
		| "utf16le"
		| "utf-16le"
		| "latin1"
		| "ascii"
		| "ucs2"
		| "ucs-2";
	/**
	 * The prefix length of the hash digest to use, defaults to 4.
	 */
	hashDigestLength?: PositiveNumber;
	/**
	 * The hashing algorithm to use, defaults to 'md4'. All functions from Node.JS' crypto.createHash are supported.
	 */
	hashFunction?: HashFunction;
}
