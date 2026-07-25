import { createRequire } from "module";

const require = createRequire(import.meta.url);

const smartGrouping =
	/** @type {typeof import("../../../../lib/util/smartGrouping")} */
	(require("../../../../lib/util/smartGrouping.js"));

/** @typedef {{ id: number, type: string, packageName: string, cached: boolean }} StatsItem */
/** @typedef {{ name: string, children: unknown[], size: number }} StatsGroup */

/** @type {StatsItem[]} */
let items = [];
/** @type {unknown} */
let sink;

/** @type {import("../../../../lib/util/smartGrouping").GroupConfig<StatsItem, StatsGroup>[]} */
const groupConfigs = [
	{
		getKeys: (item) => [item.type],
		getOptions: () => ({ targetGroupCount: 4 }),
		createGroup: (name, children, groupedItems) => ({
			name: `type:${name}`,
			children,
			size: groupedItems.length
		})
	},
	{
		getKeys: (item) => [item.packageName],
		getOptions: () => ({ groupChildren: false, targetGroupCount: 20 }),
		createGroup: (name, children, groupedItems) => ({
			name: `package:${name}`,
			children,
			size: groupedItems.length
		})
	},
	{
		getKeys: (item) => (item.cached ? ["cached"] : ["built"]),
		createGroup: (name, children, groupedItems) => ({
			name,
			children,
			size: groupedItems.length
		})
	}
];

export default {
	name: "unit/util/smartGrouping",
	setup() {
		const types = ["javascript/auto", "javascript/esm", "css/auto", "asset"];
		items = Array.from({ length: 5000 }, (_, id) => ({
			id,
			type: types[id % types.length],
			packageName: `package-${id % 120}`,
			cached: id % 3 !== 0
		}));
	},
	teardown() {
		items = [];
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "group 5000 stats items",
			fn() {
				sink = smartGrouping(items, groupConfigs);
			}
		}
	]
};
