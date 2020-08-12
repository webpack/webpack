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
import {
	value as valueDirect,
	value2 as value2Direct,
	default as Default1
} from "./direct-export";
import {
	value as valueChecked,
	value2 as value2Checked
} from "./checked-export";
import Default2 from "./dynamic-reexport-default";
import {
	value as valueMultipleSources,
	value2 as value2MultipleSources
} from "./multiple-sources";
import { a, b } from "./swapped";

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

it("should handle direct export when reexporting", () => {
	expect(valueDirect).toBe(42);
	expect(value2Direct).toBe(42);
});

it("should handle checked dynamic export when reexporting", () => {
	expect(valueChecked).toBe(42);
	expect(value2Checked).toBe(42);
});

it("should handle default export correctly", () => {
	expect(Default1).toBe(undefined);
	expect(Default2).toBe("static");
});

it("should handle multiple dynamic sources correctly", () => {
	expect(valueMultipleSources).toBe(42);
	expect(value2MultipleSources).toBe(42);
});

it("should handle renamed dynamic reexports", () => {
	expect(a).toBe(43);
	expect(b).toBe(42);
});
