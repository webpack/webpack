import { name as ifElse } from "./if-else";
import { name as ternary } from "./ternary";
import { name as logical } from "./logical";
import { value } from "./member";
import { name as unconditional } from "./unconditional";
import { name as property, other } from "./property";
import { name as neverCalled } from "./never-called";

it("should use the branch taken for a conditional `module.exports = require()`", () => {
	expect(globalThis.conditionalReexportFlag).toBe(undefined);
	expect(ifElse).toBe("b");
	expect(ternary).toBe("b");
	expect(logical).toBe("b");
});

it("should use the branch taken for a conditional `exports.x = require()`", () => {
	expect(value.name).toBe("b");
	expect(property).toBe("b");
	expect(other.name).toBe("b");
});

it("should not re-export from an assignment in a function that never runs", () => {
	expect(neverCalled).toBe("unset");
});

it("should still re-export an unconditional `module.exports = require()`", () => {
	expect(unconditional).toBe("b");
});
