import { value } from "./barrel";
import { other } from "./barrel";
import "./effect?one";
import "./effect?two";
import * as star from "./star-barrel";
import * as legacyStar from "./star-barrel?legacy";

const commonjs = require("./commonjs");

it("preserves imports and reexports with shared connection conditions", () => {
	expect(value()).toBe(42);
	expect(other()).toBe(24);
	expect(commonjs.value()).toBe(42);
	expect(commonjs.other()).toBe(24);
	expect(star.value()).toBe(42);
	expect(star.other()).toBe(24);
	expect(legacyStar.value()).toBe(42);
	expect(global.DEPENDENCY_EFFECTS).toBe(2);
	delete global.DEPENDENCY_EFFECTS;
});
