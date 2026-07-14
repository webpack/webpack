import flaggedDefault, { value, getValue } from "./flagged";
import { a, b, inc } from "./plain";
import * as plainNs from "./plain";
import plainDefault from "./plain";
import { setValue, getValue as getLiveValue } from "./live";
import { deep } from "./nested";
import { "a-b" as ab } from "./weird-name";

it("should provide named and default exports of a __esModule-flagged module", () => {
	expect(flaggedDefault).toBe("DEFAULT");
	expect(value).toBe(42);
	expect(getValue()).toBe(42);
});

it("should provide exports of a plain CommonJS module", () => {
	expect(a).toBe(1);
	expect(b).toBe(2);
	expect(inc()).toBe(1);
	expect(inc()).toBe(2);
});

it("should build a namespace object for whole-namespace usage", () => {
	expect(plainNs.a).toBe(1);
	expect(plainNs.b).toBe(2);
	expect(plainDefault.a).toBe(1);
	expect(plainDefault.b).toBe(2);
});

it("should keep live bindings for delayed export assignments", () => {
	expect(getLiveValue()).toBe(undefined);
	setValue(7);
	expect(getLiveValue()).toBe(7);
});

it("should support nested export assignments", () => {
	expect(deep.x).toBe("deep-x");
});

it("should support non-identifier export names", () => {
	expect(ab).toBe("a-b-value");
});

it("should concatenate all CommonJS modules into the entry", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + flagged.js + plain.js + live.js + nested.js + weird-name.js
	expect(concatModules[0].modules.length).toBe(6);
});
