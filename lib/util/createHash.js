/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import Hash from "./Hash.js" */
/** @import { HashFunction } from "../../declarations/WebpackOptions.js" */
/** @import cryptoModule from "crypto" */
/** @import xxhash64 from "./hash/xxhash64.js" */
/** @import md4 from "./hash/md4.js" */
/** @import DebugHashModule from "./hash/DebugHash.js" */
/** @import BatchedHashModule from "./hash/BatchedHash.js" */
/** @import BulkUpdateHashModule from "./hash/BulkUpdateHash.js" */

/** @type {typeof cryptoModule | undefined} */
let crypto;
/** @type {typeof xxhash64 | undefined} */
let createXXHash64;
/** @type {typeof md4 | undefined} */
let createMd4;
/** @type {typeof DebugHashModule | undefined} */
let DebugHash;
/** @type {typeof BatchedHashModule | undefined} */
let BatchedHash;
/** @type {typeof BulkUpdateHashModule | undefined} */
let BulkUpdateHash;

/**
 * Creates a hash by name or function
 * @param {HashFunction} algorithm the algorithm name or a constructor creating a hash
 * @returns {Hash} the hash
 */
module.exports = (algorithm) => {
	if (typeof algorithm === "function") {
		if (BulkUpdateHash === undefined) {
			BulkUpdateHash = require("./hash/BulkUpdateHash");
		}
		const HashConstructor = algorithm;
		return new BulkUpdateHash(() => new HashConstructor());
	}
	switch (algorithm) {
		case "debug":
			if (DebugHash === undefined) {
				DebugHash = require("./hash/DebugHash");
			}
			return new DebugHash();
		case "xxhash64":
			if (createXXHash64 === undefined) {
				createXXHash64 = require("./hash/xxhash64");
				if (BatchedHash === undefined) {
					BatchedHash = require("./hash/BatchedHash");
				}
			}
			return new /** @type {typeof BatchedHashModule} */ (BatchedHash)(
				createXXHash64()
			);
		case "md4":
			if (createMd4 === undefined) {
				createMd4 = require("./hash/md4");
				if (BatchedHash === undefined) {
					BatchedHash = require("./hash/BatchedHash");
				}
			}
			return new /** @type {typeof BatchedHashModule} */ (BatchedHash)(
				createMd4()
			);
		case "native-md4":
			if (crypto === undefined) crypto = require("crypto");
			if (BulkUpdateHash === undefined) {
				BulkUpdateHash = require("./hash/BulkUpdateHash");
			}
			return new BulkUpdateHash(
				() =>
					/** @type {Hash} */ (
						/** @type {typeof cryptoModule} */
						(crypto).createHash("md4")
					),
				"md4"
			);
		default:
			if (crypto === undefined) crypto = require("crypto");
			if (BulkUpdateHash === undefined) {
				BulkUpdateHash = require("./hash/BulkUpdateHash");
			}
			return new BulkUpdateHash(
				() =>
					/** @type {Hash} */ (
						/** @type {typeof cryptoModule} */
						(crypto).createHash(algorithm)
					),
				algorithm
			);
	}
};
