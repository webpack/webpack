import { unused, unprovided } from "./unused";
import {
	value as valueStatic,
	valueUsed as valueUsedStatic
} from "./dedupe-target-static";
import {
	value as valueSide,
	valueUsed as valueUsedSide
} from "./dedupe-target-with-side";
import { value, valueUsed } from "./dedupe-target";
import * as DefaultExport from "./default-export";

it("should dedupe static reexport target", () => {
	expect(valueStatic).toBe(42);
	expect(valueUsedStatic).toBe(unused);
});

it("should dedupe dynamic reexport target", () => {
	expect(value).toBe(undefined);
	expect(valueUsed).toBe(unused);
});

it("should not dedupe dynamic reexport target when it has side-effects", () => {
	expect(valueSide).toBe(undefined);
	expect(valueUsedSide).toBe(true);
});

it("should optimize dynamic default reexport", () => {
	expect(DefaultExport.a).toBe(42);
	expect(DefaultExport.b).toBe(42);
	expect(DefaultExport.empty).toEqual({});
	expect(DefaultExport.json).toBe(42);
});

it("should handle default export when reexporting", () => {
	const module = Object(require("./reexports-excludes-default"));
	expect(module.defaultProvided).toBe(unprovided);
});
