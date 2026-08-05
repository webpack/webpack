import { createRequire } from "module";
import { deterministicBytes } from "../../helpers/prng.mjs";

const require = createRequire(import.meta.url);

const createHash =
	/** @type {import("../../../../lib/util/createHash")} */
	(require("../../../../lib/util/createHash.js"));

/** @type {Buffer[]} */
let chunks = [];
/** @type {string[]} */
let shortStrings = [];
/** @type {string | Buffer} */
let sink = "";

/**
 * @param {string} algorithm hash algorithm
 * @returns {void}
 */
function hashChunks(algorithm) {
	const hash = createHash(algorithm);
	for (const chunk of chunks) hash.update(chunk);
	sink = hash.digest("hex");
}

export default {
	name: "unit/util/createHash",
	setup() {
		// 1 MiB in 4 KiB chunks — the shape of module source hashing.
		chunks = Array.from({ length: 256 }, (_, i) =>
			deterministicBytes(i + 1, 4096)
		);
		shortStrings = Array.from(
			{ length: 2000 },
			(_, i) => `webpack/lib/some/module-${i}.js|${i}|fallback`
		);
	},
	teardown() {
		chunks = [];
		shortStrings = [];
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "md4 1 MiB in 4 KiB chunks",
			fn() {
				hashChunks("md4");
			}
		},
		{
			name: "xxhash64 1 MiB in 4 KiB chunks",
			fn() {
				hashChunks("xxhash64");
			}
		},
		{
			name: "sha256 1 MiB in 4 KiB chunks",
			fn() {
				hashChunks("sha256");
			}
		},
		{
			name: "xxhash64 2000 short strings",
			fn() {
				// One hash instance per string — the per-identifier hashing shape.
				for (const str of shortStrings) {
					const hash = createHash("xxhash64");
					hash.update(str);
					sink = hash.digest("hex");
				}
			}
		}
	]
};
