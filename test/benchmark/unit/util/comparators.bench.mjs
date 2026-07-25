import { createRequire } from "module";
import { mulberry32 } from "../../helpers/prng.mjs";

const require = createRequire(import.meta.url);

const comparators =
	/** @type {typeof import("../../../../lib/util/comparators")} */
	(require("../../../../lib/util/comparators.js"));

/** @type {string[]} */
let strings = [];
/** @type {(string | number)[]} */
let ids = [];
let sink = 0;

/**
 * @template T
 * @param {T[]} items items to shuffle
 * @param {number} seed random seed
 * @returns {void}
 */
function shuffle(items, seed) {
	const random = mulberry32(seed);
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		const value = items[i];
		items[i] = items[j];
		items[j] = value;
	}
}

export default {
	name: "unit/util/comparators",
	setup() {
		strings = Array.from(
			{ length: 10_000 },
			(_, i) =>
				`node_modules/package-${i % 200}/chunk-${i % 80}/module-${i}.js`
		);
		ids = Array.from({ length: 10_000 }, (_, i) =>
			i % 5 === 0 ? `chunk-${i}` : i
		);
		shuffle(strings, 42);
		shuffle(ids, 73);
	},
	teardown() {
		strings = [];
		ids = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "sort 10000 paths numerically",
			fn() {
				sink = [...strings].sort(comparators.compareStringsNumeric).length;
			}
		},
		{
			name: "sort 10000 mixed ids",
			fn() {
				sink = [...ids].sort(comparators.compareIds).length;
			}
		}
	]
};
