import {
	read as readExports,
	call as callExports,
	grouped,
	groupedMissing
} from "./exports";
import { read as readModuleExports, call as callModuleExports } from "./module-exports";
import { read as readThis, call as callThis } from "./this";
import { read as readBase, call as callBase } from "./optional-base";

it("should preserve optional self-reference reads when mangling exports", () => {
	expect(readExports()).toEqual([undefined, "exports", "exports", undefined, "exports"]);
	expect(readModuleExports()).toEqual([undefined, "module.exports", "module.exports", undefined, "module.exports"]);
	expect(readThis()).toEqual([undefined, "this", "this", undefined, "this"]);
});

it("should preserve optional calls, their arguments and their receiver", () => {
	expect(callExports()).toEqual([undefined, "exports!", "exports?", "exports."]);
	expect(callModuleExports()).toEqual([undefined, "module.exports!", "module.exports?", "module.exports."]);
	expect(callThis()).toEqual([undefined, "this!", "this?", "this."]);
});

it("should preserve optional access to the exports object", () => {
	expect(readBase()).toEqual(["base", "base", "base"]);
	expect(callBase()).toEqual([
		"base!",
		"base!",
		"base!",
		"base!",
		"base!",
		"base!"
	]);
});

it("should preserve calls outside a parenthesized optional chain", () => {
	expect(grouped()).toBe("exports!");
	expect(groupedMissing).toThrow(TypeError);
});
