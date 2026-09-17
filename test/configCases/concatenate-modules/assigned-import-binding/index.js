import { read } from "./state";
import { sum, writeConst, writeLet } from "./writer";
import { bump, bumpInExpression } from "./bump";
import { readCount } from "./counter";

it("should reject a write to an imported binding", () => {
	expect(writeLet).toThrow(TypeError);
	expect(writeConst).toThrow(TypeError);
	expect(read()).toBe(1);
	expect(sum()).toBe(103);
});

it("should reject a compound write and one in expression position", () => {
	expect(bump).toThrow(TypeError);
	expect(bumpInExpression).toThrow(TypeError);
	expect(readCount()).toBe(0);
});

it("should still concatenate every module", () => {
	const concatenated = __STATS__.modules.filter((m) => m.modules);
	expect(concatenated).toHaveLength(1);
	expect(concatenated[0].modules.map((m) => m.name).sort()).toEqual([
		"./bump.js",
		"./counter.js",
		"./helper.js",
		"./index.js",
		"./state.js",
		"./writer.js"
	]);
});
