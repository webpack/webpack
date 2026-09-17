import { read } from "./state";
import { sum, updateConst, writeConst, writeLet } from "./writer";
import { bump, bumpInExpression, bumpPostfix, bumpPrefix } from "./bump";
import { readCount } from "./counter";
import { updateMember, updateMemberPrefix, writeMember } from "./namespace";

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

it("should reject an update of an imported binding", () => {
	expect(bumpPostfix).toThrow(TypeError);
	expect(bumpPrefix).toThrow(TypeError);
	// an inlined literal is no update target at all, so the export stays a binding
	expect(updateConst).toThrow(TypeError);
	expect(readCount()).toBe(0);
	expect(sum()).toBe(103);
});

it("should reject a write through the namespace object", () => {
	expect(writeMember).toThrow(TypeError);
	expect(updateMember).toThrow(TypeError);
	expect(updateMemberPrefix).toThrow(TypeError);
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
		"./namespace.js",
		"./state.js",
		"./writer.js"
	]);
});
