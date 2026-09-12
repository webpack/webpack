import jsonDefault from "./data.json" with { type: "json" };
import * as json from "./data.json" with { type: "json" };
import * as text from "./note.txt" with { type: "text" };
import * as named from "./named.json";
import * as cjs from "./cjs.js";
import { seenElsewhere } from "./other.js";

it("should hand out a spec namespace for a JSON module", () => {
	expect(Object.getOwnPropertyNames(json)).toEqual(["default"]);
	expect(json.default).toBe(262);
	expect(Object.getPrototypeOf(json)).toBe(null);
	expect(json[Symbol.toStringTag]).toBe("Module");
	expect(Object.isExtensible(json)).toBe(false);
});

it("should hand out a spec namespace for a text module", () => {
	expect(Object.getOwnPropertyNames(text)).toEqual(["default"]);
	expect(typeof text.default).toBe("string");
});

it("should hand out a spec namespace for a dynamically imported JSON module", () =>
	import("./data.json", { with: { type: "json" } }).then((ns) => {
		expect(Object.getOwnPropertyNames(ns)).toEqual(["default"]);
		expect(ns.default).toBe(262);
	}));

it("should keep the named exports webpack adds to a bare JSON import", () => {
	expect(Object.getOwnPropertyNames(named)).toEqual(["a", "b", "default"]);
});

it("should hand out a spec namespace for a CommonJS module", () => {
	expect(Object.getOwnPropertyNames(cjs)).toEqual(["a", "b", "default"]);
	expect(cjs.a).toBe(1);
	expect(cjs.default.b).toBe(2);
});

it("should hide the marker without changing what the module exports", () => {
	// Only the namespace view drops `__esModule`; the value behind it is
	// untouched, so interop still reads the module the way it always did.
	expect("__esModule" in json).toBe(false);
	expect(require("./data.json")).toBe(262);
	expect(jsonDefault).toBe(262);
});

it("should hand every importer of one module the same namespace", () => {
	// The spec has one namespace object per module, so a second importer has to
	// reach the very same object rather than an equal-looking one.
	expect(json).toBe(seenElsewhere.json);
	expect(text).toBe(seenElsewhere.text);
	expect(cjs).toBe(seenElsewhere.cjs);
});

it("should reach that same namespace through a dynamic import", () =>
	import("./data.json", { with: { type: "json" } }).then((ns) => {
		expect(ns).toBe(json);
	}));
