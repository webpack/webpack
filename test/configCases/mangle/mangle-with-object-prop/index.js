import { moduleId, toString, abc } from "./module";
const moduleId2 = require("./commonjs").moduleId;
const toString2 = require("./commonjs").toString;
const abc2 = require("./commonjs").abc;

it("should mangle names and remove exports even with toString named export (ESM)", () => {
	expect(abc).toBe("abc");
	expect(toString()).toBe("toString");
	expect(
		Object.keys(require.cache[moduleId].exports)
			.map(p => p.length)
			.sort()
	).toEqual([2, 2, 2]);
});

it("should mangle names and remove exports even with toString named export (CJS)", () => {
	expect(abc2).toBe("abc");
	expect(toString2()).toBe("toString");
	expect(
		Object.keys(require.cache[moduleId2].exports)
			.map(p => p.length)
			.sort()
	).toEqual([2, 2, 8]);
});
