import { createRequire } from "module";
import { mulberry32 } from "../../helpers/prng.mjs";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const SortableSet =
	/** @type {typeof import("../../../../lib/util/SortableSet")} */
	(require("../../../../lib/util/SortableSet.js"));
const { compareIds } =
	/** @type {import("../../../../lib/util/comparators")} */
	(require("../../../../lib/util/comparators.js"));

/** @type {(string | number)[]} */
let shuffledIds = [];
/** @type {import("../../../../lib/util/SortableSet")<string | number>} */
let set = new SortableSet();
let sink = 0;

export default defineSuite({
	name: "unit/util/SortableSet",
	setup() {
		// Deterministically shuffled mix of numeric and named ids, the shape
		// chunk/module id sets have when sorted during codegen.
		const random = mulberry32(42);
		shuffledIds = [];
		for (let i = 0; i < 10_000; i++) {
			shuffledIds.push(i % 5 === 0 ? `module-${i}` : i);
		}
		for (let i = shuffledIds.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			const tmp = shuffledIds[i];
			shuffledIds[i] = shuffledIds[j];
			shuffledIds[j] = tmp;
		}
	},
	teardown() {
		shuffledIds = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "sortWith compareIds 10k entries",
			beforeEach() {
				// Fresh set per round: sortWith caches the last sort fn, so a
				// reused set would measure the cached no-op instead of the sort.
				set = new SortableSet(shuffledIds);
			},
			fn() {
				set.sortWith(compareIds);
				sink = set.size;
			}
		},
		{
			name: "construct from 10k entries",
			fn() {
				sink = new SortableSet(shuffledIds).size;
			}
		}
	]
});
