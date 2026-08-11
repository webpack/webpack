import fs from "fs";
import path from "path";

// Referenced so both chunks exist; the baked specifier is what is under test.
const flat = () => import(/* webpackChunkName: "flat" */ "./flat");
const deep = () => import(/* webpackChunkName: "nested/deep" */ "./deep");

const stats = __STATS__.children[__INDEX__];
const specifier = (name) =>
	fs
		.readFileSync(path.join(stats.outputPath, __DIR__, name), "utf8")
		.match(/asset import \*\/ "([^"]+)"/)[1];

it("should keep both chunks referenced", () => {
	expect(typeof flat).toBe("function");
	expect(typeof deep).toBe("function");
});

it("should bake what each depth needs", () => {
	expect(specifier("flat.mjs")).toBe(__ROOT__);
	expect(specifier("nested/deep.mjs")).toBe(__DEEP__);
});
