import { createRequire } from "module";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const property =
	/** @type {import("../../../../lib/util/property")} */
	(require("../../../../lib/util/property.js"));

/** @type {string[]} */
let names = [];
/** @type {string[][]} */
let chains = [];
/** @type {string} */
let sink = "";

export default defineSuite({
	name: "unit/util/property",
	setup() {
		names = [];
		for (let i = 0; i < 200; i++) {
			names.push(
				`validName${i}`,
				"default",
				`with-dash-${i}`,
				`${i}numeric`,
				`has space ${i}`
			);
		}
		chains = names.map((name, i) => [
			"webpackExports",
			name,
			`nested${i % 10}`
		]);
	},
	teardown() {
		names = [];
		chains = [];
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "propertyName 1000 names",
			fn() {
				// Runtime template generation quotes every export name this way.
				for (const name of names) sink = property.propertyName(name);
			}
		},
		{
			name: "propertyAccess 1000 chains",
			fn() {
				for (const chain of chains) sink = property.propertyAccess(chain);
			}
		}
	]
});
