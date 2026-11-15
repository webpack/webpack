import { readFileSync } from "fs";

const path = require("path");
const join = require("join");
const external = require("external");

// Built dynamically so the asserted phrases never appear verbatim in this file,
// which is itself embedded into the bundle being inspected.
const getter = (name) => `process.${"getBuiltinModule"}(${JSON.stringify(name)})`;
const createRequire = (name) =>
	`${"__WEBPACK_EXTERNAL_createRequire"}_require(${JSON.stringify(name)})`;

const source = readFileSync(
	path.join(
		__STATS__.children[__STATS_I__].outputPath,
		`bundle${__STATS_I__}.mjs`
	),
	"utf-8"
);

it("should load each external at runtime", () => {
	expect(typeof readFileSync).toBe("function");
	expect(join).toBe(path.join);
	expect(typeof external.SyncHook).toBe("function");
});

it("should keep ESM imports of builtins static", () => {
	expect(source).toMatch(/^import .+ from "fs";$/m);
});

it("should read required builtins through the getter when the target has it", () => {
	if (__STATS_I__ === 0) {
		// a node target needs neither the `process` nor the getter `typeof` guard
		expect(source).toContain(`module.exports = ${getter("path")};`);
		expect(source).toContain(`module.exports = ${getter("path")}.join;`);
		expect(source).not.toContain(createRequire("path"));
	} else {
		expect(source).toContain(createRequire("path"));
		expect(source).not.toContain(getter("path"));
	}
	expect(source).toContain(createRequire("tapable"));
});
