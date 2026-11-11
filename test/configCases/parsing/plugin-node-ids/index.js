import "./string-key";
import "./module-string-key";
import "./number-key";
import "./statement-kinds";
import "./impure-for-update";
import { current, declaredDefault, fixed, plainLive, reset } from "./live";
import {
	literal,
	template,
	dynamicTemplate,
	computed,
	spread
} from "./pure-calls";

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should drop modules whose statements are all pure", () => {
	expect(
		["string-key", "module-string-key", "statement-kinds"].filter(bundled)
	).toEqual([]);
});

it("should keep modules with an effect", () => {
	expect(["number-key", "impure-for-update"].filter(bundled)).toEqual([
		"number-key",
		"impure-for-update"
	]);
});

it("should write a live binding through a shorthand default", () => {
	expect(current).toBe(0);
	expect(plainLive).toBe(5);
	reset();
	expect(plainLive).toBe(6);
	expect(current).toBe(2);
	expect(fixed).toBe(1);
	expect(declaredDefault).toBe(3);
});

it("should call imported members through static and dynamic keys", () => {
	expect([literal, template, dynamicTemplate, computed, spread]).toEqual([
		1, 2, 3, 4, 3
	]);
});
