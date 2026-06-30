const fs = require("fs");
const path = require("path");

it("should default globalObject to globalThis for a web+node UMD build", () => {
	const main = fs.readFileSync(path.join(__dirname, "main.js"), "utf8");
	const runtime = fs.readFileSync(path.join(__dirname, "runtime.js"), "utf8");
	// the UMD wrapper must hand `globalThis` (not `self`/`window`) to the factory
	expect(main).toContain("})(globalThis,");
	// the chunk-loading runtime must register on the same universal accessor
	expect(runtime).toContain("globalThis");
});

it("should compile and run", () => {
	expect(hello()).toBe("hello");
});

export function hello() {
	return "hello";
}
