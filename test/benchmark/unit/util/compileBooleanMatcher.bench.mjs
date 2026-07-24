import { createRequire } from "module";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const compileBooleanMatcher =
	/** @type {import("../../../../lib/util/compileBooleanMatcher")} */
	(require("../../../../lib/util/compileBooleanMatcher.js"));

/** @type {Record<string, boolean>} */
let chunkIdMap = {};
/** @type {Record<string, boolean>} */
let namedIdMap = {};
/** @type {unknown} */
let sink;

export default defineSuite({
	name: "unit/util/compileBooleanMatcher",
	setup() {
		// The chunk-loading runtime compiles one matcher per chunk-having
		// condition; maps look like {chunkId: hasCss} over the whole build.
		chunkIdMap = {};
		for (let i = 0; i < 2000; i++) {
			chunkIdMap[`${i}`] = i % 3 !== 0;
		}
		namedIdMap = {};
		for (let i = 0; i < 800; i++) {
			namedIdMap[`vendors-node_modules_pkg-${i % 100}_index_js-${i}`] =
				i % 4 !== 0;
		}
	},
	teardown() {
		chunkIdMap = {};
		namedIdMap = {};
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "2000 numeric ids",
			fn() {
				const matcher = compileBooleanMatcher(chunkIdMap);
				sink = typeof matcher === "function" ? matcher("chunkId") : matcher;
			}
		},
		{
			name: "800 named ids",
			fn() {
				const matcher = compileBooleanMatcher(namedIdMap);
				sink = typeof matcher === "function" ? matcher("chunkId") : matcher;
			}
		}
	]
});
