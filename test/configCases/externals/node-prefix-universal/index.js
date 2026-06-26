const fs = require("fs");
const path = require("path");

const outputPath = __STATS__.outputPath;
const source = fs.readFileSync(path.join(outputPath, "bundle0.mjs"), "utf-8");

// Built dynamically so the asserted phrase never appears verbatim in this file,
// which is itself embedded into the bundle being inspected.
const ext = (name) => `createRequire_require(${JSON.stringify(name)})`;
const prefixed = (name) => `${"node"}:${name}`;

it("should resolve the node built-ins at runtime", () => {
	expect(typeof fs.readFileSync).toBe("function");
	expect(typeof path.join).toBe("function");
});

it("should add the `node:` prefix in a universal bundle (deno/bun compat)", () => {
	// bare `require("fs")` in the source is emitted with the prefix for portability
	expect(source).toContain(ext(prefixed("fs")));
	expect(source).toContain(ext(prefixed("path")));
	expect(source).not.toContain(ext("fs"));
	expect(source).not.toContain(ext("path"));
});
