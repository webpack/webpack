import { createRequire } from "module";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const semver =
	/** @type {import("../../../../lib/util/semver")} */
	(require("../../../../lib/util/semver.js"));

const RANGES = [
	"^1.2.3",
	"~2.4.0",
	">=1.0.0 <2.0.0",
	"1.2.3 - 2.3.4",
	"^1.2.3 || ^2.0.0",
	"2.x",
	"*",
	">=16.8.0 <17.0.0 || ^18.0.0"
];

const VERSIONS = ["1.2.3", "1.9.9", "2.0.0", "2.4.1", "16.14.0", "18.2.0"];

/** @type {import("../../../../lib/util/semver").SemVerRange[]} */
let parsedRanges = [];
/** @type {unknown} */
let sink;

export default defineSuite({
	name: "unit/util/semver",
	setup() {
		parsedRanges = RANGES.map((range) => semver.parseRange(range));
	},
	teardown() {
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "parseRange 80 ranges",
			fn() {
				// Module Federation parses ranges for every shared module.
				for (let i = 0; i < 10; i++) {
					for (const range of RANGES) {
						sink = semver.parseRange(range);
					}
				}
			}
		},
		{
			name: "satisfy 48 range/version pairs",
			fn() {
				let matches = 0;
				for (const range of parsedRanges) {
					for (const version of VERSIONS) {
						if (semver.satisfy(range, version)) matches++;
					}
				}
				sink = matches;
			}
		},
		{
			name: "rangeToString 80 ranges",
			fn() {
				for (let i = 0; i < 10; i++) {
					for (const range of parsedRanges) {
						sink = semver.rangeToString(range);
					}
				}
			}
		}
	]
});
