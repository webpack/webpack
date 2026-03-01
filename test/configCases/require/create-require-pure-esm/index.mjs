import { createRequire } from "module";
import { createRequire as createRequireNode } from "node:module";

const require = createRequire(import.meta.url);

it("should create require in pure ESM file when commonjs is disabled", () => {
	expect(require("./a.cjs")).toBe(1);
	expect(createRequireNode(import.meta.url)("./b.cjs")).toBe(2);
});

it("should resolve using created require in pure ESM file when commonjs is disabled", () => {
	expect(require.resolve("./a.cjs")).toBe("./a.cjs");
	expect(createRequireNode(import.meta.url).resolve("./b.cjs")).toBe("./b.cjs");
});
