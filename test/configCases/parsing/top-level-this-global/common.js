"use strict";

this.topLevelAssignment = "assigned";

Object.defineProperty(this, "topLevelDefined", { value: "defined" });

const fromArrow = (() => this)();

function receiver() {
	return this;
}

module.exports.marker = "exports";

it("should make the top level this the global object", () => {
	expect(this).toBe(globalThis);
	expect(this).not.toBe(module.exports);
});

it("should assign to the global object", () => {
	expect(globalThis.topLevelAssignment).toBe("assigned");
	expect(module.exports.topLevelAssignment).toBe(undefined);
});

it("should define a property on the global object", () => {
	expect(globalThis.topLevelDefined).toBe("defined");
	expect(module.exports.topLevelDefined).toBe(undefined);
});

it("should read the global object through a top level arrow function", () => {
	expect(fromArrow).toBe(globalThis);
});

it("should leave the this of a function alone", () => {
	expect(receiver.call("context")).toBe("context");
});

it("should keep top level declarations in the module scope", () => {
	expect(globalThis["receiver"]).toBe(undefined);
	expect(globalThis["fromArrow"]).toBe(undefined);
});

it("should keep exporting through module.exports", () => {
	expect(require("./common").marker).toBe("exports");
});
