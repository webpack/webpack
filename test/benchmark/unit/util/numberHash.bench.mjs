import { createRequire } from "module";

const require = createRequire(import.meta.url);

const numberHash =
	/** @type {import("../../../../lib/util/numberHash")} */
	(require("../../../../lib/util/numberHash.js"));

/** @type {string[]} */
let identifiers = [];
let sink = 0;

export default {
	name: "unit/util/numberHash",
	setup() {
		// Module-identifier-shaped strings — what deterministic ids hash.
		identifiers = Array.from(
			{ length: 1000 },
			(_, i) =>
				`./node_modules/package-${i % 50}/dist/esm/internal/chunk-${i}.mjs`
		);
	},
	teardown() {
		identifiers = [];
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "1000 identifiers, small range",
			fn() {
				let total = 0;
				for (const id of identifiers) total += numberHash(id, 1000);
				sink = total;
			}
		},
		{
			name: "1000 identifiers, large range",
			fn() {
				let total = 0;
				for (const id of identifiers) total += numberHash(id, 2 ** 31);
				sink = total;
			}
		}
	]
};
