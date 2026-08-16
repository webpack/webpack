import { createRequire } from "module";

const require = createRequire(import.meta.url);

const createMappings =
	/** @type {typeof import("../../../../lib/util/createMappings")} */
	(require("../../../../lib/util/createMappings.js"));

/** @type {import("../../../../lib/util/createMappings").LineMappings[]} */
let lines = [];
/** @type {number[]} */
let values = [];
let sink = "";

export default {
	name: "unit/util/createMappings",
	setup() {
		lines = Array.from({ length: 20_000 }, (_, i) => {
			if (i % 11 === 0) return null;
			const first = {
				generatedColumn: 0,
				sourceIndex: i % 40,
				originalLine: i * 2,
				originalColumn: i % 120,
				nameIndex: i % 300
			};
			return i % 5 === 0
				? [
						first,
						{
							generatedColumn: 24,
							sourceIndex: i % 40,
							originalLine: i * 2,
							originalColumn: (i % 120) + 12
						}
					]
				: first;
		});
		values = Array.from({ length: 10_000 }, (_, i) =>
			i % 2 === 0 ? i * 7919 : i * -3571
		);
	},
	teardown() {
		lines = [];
		values = [];
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "encode 100000 VLQ values",
			fn() {
				for (let i = 0; i < 10; i++) {
					for (const value of values) {
						sink = createMappings.encodeVLQ(value);
					}
				}
			}
		},
		{
			name: "encode mappings for 20000 lines",
			fn() {
				sink = createMappings.encodeMappings(lines);
			}
		}
	]
};
