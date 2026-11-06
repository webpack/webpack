import data from "./bridge.cjs";
import indexed from "./indexed";
import known from "./known-bridge.cjs";
import direct from "./direct.json";

it("should keep ordinary imports and property writes precise", () => {
	expect(data.kept).toBe(42);
	expect(typeof data.missing).toBe("undefined");
	expect(typeof data.hasOwnProperty).toBe("function");
	data.added = 7;
	expect(data.added).toBe(7);
});

it("should keep required property reads precise", () => {
	expect(require("./bridge.cjs").kept).toBe(42);
	expect(typeof require("./bridge.cjs").missing).toBe("undefined");
	const required = require("./bridge.cjs");
	expect(required.kept).toBe(42);
	expect(typeof required.hasOwnProperty).toBe("function");
});

it("should keep dynamically imported property reads precise", async () => {
	await import("./bridge.cjs").then(module => {
		expect(module.default.kept).toBe(42);
		expect(typeof module.default.missing).toBe("undefined");
	});
});

it("should keep property reads consistent with mangled JSON properties", () => {
	expect(direct.object.kept).toBe(42);
	expect(typeof direct.hasOwnProperty).toBe("function");
});

it("should still tree shake provided JSON indices", () => {
	expect(indexed[0]).toBe("md");
	expect(indexed.length).toBe(2);
});

it("should still tree shake known CommonJS function exports", () => {
	expect(known.used()).toBe(42);
	expect(require("./known-bridge.cjs").used()).toBe(42);
	const bound = require("./known-bridge.cjs");
	expect(bound.used()).toBe(42);
	expect(known.usedExports).toEqual(["used", "usedExports"]);
});

it("should remove data unused by property reads, writes and calls", () => {
	expect(global.__propertyAccessUsedExports.bridge).toEqual(["added", "hasOwnProperty", "kept", "missing"]);
	expect(global.__propertyAccessUsedExports.indexed).toEqual(["0", "length"]);
});
