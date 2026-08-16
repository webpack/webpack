import { createRequire } from "module";

const require = createRequire(import.meta.url);

const AsyncQueue =
	/** @type {typeof import("../../../../lib/util/AsyncQueue")} */
	(require("../../../../lib/util/AsyncQueue.js"));

/** @type {number[]} */
let uniqueItems = [];
/** @type {number[]} */
let duplicateItems = [];
let sink = 0;

/** @type {import("../../../../lib/util/AsyncQueue").Processor<number, number>} */
const processor = (item, callback) => callback(null, item);

/**
 * @param {number[]} items queue input
 * @returns {Promise<number>} sum of processed results
 */
function processItems(items) {
	return new Promise((resolve, reject) => {
		const queue = new AsyncQueue({
			name: "benchmark",
			parallelism: 100,
			processor
		});
		let remaining = items.length;
		let total = 0;
		/**
		 * @param {Error | null | undefined} err queue error
		 * @param {number | null | undefined} result queue result
		 */
		const onResult = (err, result) => {
			if (err) {
				reject(err);
				return;
			}
			total += result || 0;
			if (--remaining === 0) resolve(total);
		};
		for (const item of items) {
			queue.add(item, onResult);
		}
	});
}

export default {
	name: "unit/util/AsyncQueue",
	setup() {
		uniqueItems = Array.from({ length: 5000 }, (_, i) => i);
		duplicateItems = Array.from({ length: 5000 }, (_, i) => i % 500);
	},
	teardown() {
		uniqueItems = [];
		duplicateItems = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "process 5000 unique items",
			async fn() {
				sink = await processItems(uniqueItems);
			}
		},
		{
			name: "deduplicate 5000 items to 500 keys",
			async fn() {
				sink = await processItems(duplicateItems);
			}
		}
	]
};
