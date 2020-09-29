import { moduleId, setToString, toString, abc, a, $1, __1 } from "./module";
const moduleId2 = require("./commonjs").moduleId;
const toString2 = require("./commonjs").toString;
const setToString2 = require("./commonjs").setToString;
const abc2 = require("./commonjs").abc;
const a2 = require("./commonjs").a;
const equals2 = require("./commonjs")["="];
const $12 = require("./commonjs").$1;
const __12 = require("./commonjs").__1;

it("should mangle names and remove exports even with toString named export (ESM)", () => {
	expect(abc).toBe("abc");
	expect(toString).toBe(undefined);
	setToString();
	expect(toString()).toBe("toString");
	expect(a).toBe("single char");
	expect($1).toBe("double char");
	expect(__1).toBe("3 chars");
	expect(
		Object.keys(require.cache[moduleId].exports)
			.map(p => p.length)
			.sort()
	).toEqual(
		OPTIMIZATION === "deterministic"
			? [1, 2, 2, 2, 2, 2, 2]
			: [1, 1, 1, 1, 1, 1, 1]
	);
});

it("should mangle names and remove exports even with toString named export (CJS)", () => {
	expect(abc2).toBe("abc");
	expect(toString2).toBe(Object.prototype.toString);
	setToString2();
	const toString3 = require("./commonjs").toString;
	expect(toString3()).toBe("toString");
	expect(a2).toBe("single char");
	expect(equals2).toBe("single char non-identifier");
	expect($12).toBe("double char");
	expect(__12).toBe("3 chars");
	expect(
		Object.keys(require.cache[moduleId2].exports)
			.map(p => p.length)
			.sort()
	).toEqual(
		OPTIMIZATION === "deterministic"
			? [1, 2, 2, 2, 2, 2, 2, 8]
			: [1, 1, 1, 1, 1, 1, 1, 8]
	);
});
