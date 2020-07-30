import { value as valueStatic } from "./dedupe-target-static";
import { value } from "./dedupe-target";
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

it("should dedupe static reexport target", () => {
	expect(valueStatic).toBe(42);
});

it("should dedupe dynamic reexport target", () => {
	expect(value).toBe(undefined);
});

it("should optimize dynamic default reexport", () => {
	expect(DefaultExport.a).toBe(42);
	expect(DefaultExport.b).toBe(42);
	expect(DefaultExport.empty).toEqual({});
	expect(DefaultExport.json).toBe(42);
});

it("should handle default export when reexporting", () => {
	const module = Object(require("./reexports-excludes-default"));
	expect(module.test).toBe(true);
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
