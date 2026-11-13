import { name as ifElse } from "./if-else";
import { name as ternary } from "./ternary";
import { name as logical } from "./logical";
import { name as loop } from "./loop";
import { value as overwritten } from "./overwritten";
import { name as overwrittenWhole } from "./overwritten-whole";
import { name as overwrittenName } from "./overwritten-name";
import { value as overwrittenLater } from "./overwritten-later";
import { name as overwrittenByFunction } from "./overwritten-by-function";
import { value } from "./member";
import { name as unconditional } from "./unconditional";
import { name as property, other } from "./property";
import { name as neverCalled } from "./never-called";
import { name as constant } from "./constant";
import { name as constantTernary } from "./constant-ternary";

it("should use the branch taken for a conditional `module.exports = require()`", () => {
	expect(global.conditionalReexportFlag).toBe(undefined);
	expect(ifElse).toBe("b");
	expect(ternary).toBe("b");
	expect(logical).toBe("b");
	expect(loop).toBe("b");
});

it("should use the branch taken for a conditional `exports.x = require()`", () => {
	expect(value.name).toBe("b");
	expect(property).toBe("b");
	expect(other.name).toBe("b");
});

it("should use a conditional write over an earlier re-export of the same export", () => {
	expect(overwritten.name).toBe("b");
	expect(overwrittenWhole).toBe("b");
	expect(overwrittenName).toBe("b");
});

it("should use a later write over an earlier re-export of the same export", () => {
	expect(overwrittenLater).toBe(5);
	expect(overwrittenByFunction).toBe("reset");
});

it("should not re-export from an assignment in a function that never runs", () => {
	expect(neverCalled).toBe("unset");
});

it("should still re-export an unconditional `module.exports = require()`", () => {
	expect(unconditional).toBe("b");
});

it("should re-export the branch of a condition known at build time", () => {
	expect(constant).toBe("b");
	expect(constantTernary).toBe("b");
});
