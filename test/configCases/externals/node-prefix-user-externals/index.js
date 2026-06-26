const fs = require("node:fs");
const path = require("node:path");

const outputPath = __STATS__.children[__STATS_I__].outputPath;
const source = fs.readFileSync(
	path.join(outputPath, `bundle${__STATS_I__}.js`),
	"utf-8"
);

// Built dynamically so the forbidden phrase never appears verbatim in this file,
// which is itself embedded into the bundle being inspected.
const ext = (name) => `module.exports = require(${JSON.stringify(name)})`;
const prefixed = (name) => `${"node"}:${name}`;

it("should resolve the developer-provided node externals at runtime", () => {
	expect(typeof fs.readFileSync).toBe("function");
	expect(typeof path.join).toBe("function");
});

if (__STATS_I__ === 0) {
	it("should strip `node:` from external values when the target lacks support", () => {
		expect(source).toContain(ext("fs"));
		expect(source).toContain(ext("path"));
		expect(source).not.toContain(ext(prefixed("fs")));
		expect(source).not.toContain(ext(prefixed("path")));
	});
} else {
	it("should keep the developer-provided `node:` value when supported", () => {
		expect(source).toContain(ext(prefixed("fs")));
		expect(source).toContain(ext(prefixed("path")));
	});
}
