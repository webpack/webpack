import { value as valueStatic } from "./dedupe-target-static";
import { value } from "./dedupe-target";
import * as DefaultExport from "./default-export";

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
