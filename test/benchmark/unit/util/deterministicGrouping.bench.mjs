import { createRequire } from "module";

const require = createRequire(import.meta.url);

const deterministicGrouping =
	/** @type {typeof import("../../../../lib/util/deterministicGrouping")} */
	(require("../../../../lib/util/deterministicGrouping.js"));

/** @typedef {{ key: string, size: Record<string, number> }} GroupingItem */

/** @type {GroupingItem[]} */
let singleTypeItems = [];
/** @type {GroupingItem[]} */
let mixedTypeItems = [];
let sink = 0;

const getKey = (/** @type {GroupingItem} */ item) => item.key;
const getSize = (/** @type {GroupingItem} */ item) => item.size;

export default {
	name: "unit/util/deterministicGrouping",
	setup() {
		singleTypeItems = [];
		mixedTypeItems = [];
		for (let i = 0; i < 4000; i++) {
			const key = `node_modules/package-${i % 200}/dist/chunk-${String(
				i
			).padStart(5, "0")}-${((i * 2654435761) >>> 0).toString(16)}.js`;
			const javascript = 1000 + ((i * 7919) % 30_000);
			singleTypeItems.push({ key, size: { javascript } });
			mixedTypeItems.push({
				key,
				size:
					i % 5 === 0
						? { javascript, css: 500 + ((i * 3571) % 12_000) }
						: { javascript }
			});
		}
	},
	teardown() {
		singleTypeItems = [];
		mixedTypeItems = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "group 4000 JavaScript modules",
			fn() {
				sink = deterministicGrouping({
					items: singleTypeItems,
					minSize: { javascript: 20_000 },
					maxSize: { javascript: 100_000 },
					getKey,
					getSize
				}).length;
			}
		},
		{
			name: "group 4000 modules with mixed source types",
			fn() {
				sink = deterministicGrouping({
					items: mixedTypeItems,
					minSize: { javascript: 20_000, css: 10_000 },
					maxSize: { javascript: 100_000, css: 60_000 },
					getKey,
					getSize
				}).length;
			}
		}
	]
};
