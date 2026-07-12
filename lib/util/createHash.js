/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @typedef {import("./Hash.js").default} Hash */
/** @typedef {import("../../declarations/WebpackOptions.js").HashFunction} HashFunction */

/** @type {typeof import("crypto") | undefined} */
let crypto;
/** @type {typeof import("./hash/xxhash64.js").default | undefined} */
let createXXHash64;
/** @type {typeof import("./hash/md4.js").default | undefined} */
let createMd4;
/** @type {typeof import("./hash/DebugHash.js").default | undefined} */
let DebugHash;
/** @type {typeof import("./hash/BatchedHash.js").default | undefined} */
let BatchedHash;
/** @type {typeof import("./hash/BulkUpdateHash.js").default | undefined} */
let BulkUpdateHash;

/**
 * Creates a hash by name or function
 * @param {HashFunction} algorithm the algorithm name or a constructor creating a hash
 * @returns {Hash} the hash
 */
const __esmDefault = (algorithm) => {
	if (typeof algorithm === "function") {
		if (BulkUpdateHash === undefined) {
			BulkUpdateHash =
				/** @type {typeof import("./hash/BulkUpdateHash.js").default} */ (
					require("./hash/BulkUpdateHash.js")
				);
		}
		// eslint-disable-next-line new-cap
		return new BulkUpdateHash(() => new algorithm());
	}
	switch (algorithm) {
		case "debug":
			if (DebugHash === undefined) {
				DebugHash =
					/** @type {typeof import("./hash/DebugHash.js").default} */ (
						require("./hash/DebugHash.js")
					);
			}
			return new DebugHash();
		case "xxhash64":
			if (createXXHash64 === undefined) {
				createXXHash64 =
					/** @type {typeof import("./hash/xxhash64.js").default} */ (
						require("./hash/xxhash64.js")
					);
				if (BatchedHash === undefined) {
					BatchedHash =
						/** @type {typeof import("./hash/BatchedHash.js").default} */ (
							require("./hash/BatchedHash.js")
						);
				}
			}
			return new /** @type {typeof import("./hash/BatchedHash.js").default} */ (
				BatchedHash
			)(createXXHash64());
		case "md4":
			if (createMd4 === undefined) {
				createMd4 = /** @type {typeof import("./hash/md4.js").default} */ (
					require("./hash/md4.js")
				);
				if (BatchedHash === undefined) {
					BatchedHash =
						/** @type {typeof import("./hash/BatchedHash.js").default} */ (
							require("./hash/BatchedHash.js")
						);
				}
			}
			return new /** @type {typeof import("./hash/BatchedHash.js").default} */ (
				BatchedHash
			)(createMd4());
		case "native-md4":
			if (crypto === undefined) crypto = require("node:crypto");
			if (BulkUpdateHash === undefined) {
				BulkUpdateHash =
					/** @type {typeof import("./hash/BulkUpdateHash.js").default} */ (
						require("./hash/BulkUpdateHash.js")
					);
			}
			return new BulkUpdateHash(
				() =>
					/** @type {Hash} */ (
						/** @type {typeof import("crypto")} */
						(crypto).createHash("md4")
					),
				"md4"
			);
		default:
			if (crypto === undefined) crypto = require("node:crypto");
			if (BulkUpdateHash === undefined) {
				BulkUpdateHash =
					/** @type {typeof import("./hash/BulkUpdateHash.js").default} */ (
						require("./hash/BulkUpdateHash.js")
					);
			}
			return new BulkUpdateHash(
				() =>
					/** @type {Hash} */ (
						/** @type {typeof import("crypto")} */
						(crypto).createHash(algorithm)
					),
				algorithm
			);
	}
};

export default __esmDefault;

export { __esmDefault as "module.exports" };
