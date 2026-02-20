import { createRequire } from "module";
import { createRequire as _createRequire } from "node:module";

const require = createRequire(import.meta.url);

it("should create require in ESM file", () => {
	expect(require("./a")).toBe(1);
	expect(_createRequire(import.meta.url)("./b")).toBe(2);
});

it("should resolve using created require in ESM file", () => {
	expect(require.resolve("./a")).toBe("./a.js");
	expect(_createRequire(import.meta.url).resolve("./b")).toBe("./b.js");
});

it("should require ESM export from CJS file in ESM file", () => {
	const { foo } = require("./c.js");
	expect(foo).toBe(1);
});
