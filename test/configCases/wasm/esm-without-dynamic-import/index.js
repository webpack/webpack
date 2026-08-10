import fs from "fs";
import path from "path";

it("should instantiate wasm from an ES module without dynamic import support", () =>
	import("./module").then((m) => {
		expect(m.run()).toBe(3);
	}));

it("should not reach for a CommonJS loader in the ES module", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Built at runtime so this assertion doesn't match its own source, and anchored
	// on a non-word char so `__webpack_require__(` doesn't either.
	const bareRequire = new RegExp(`[^\\w.]${"require"}\\(`);

	expect(bundle).not.toMatch(bareRequire);
});
