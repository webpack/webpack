// `new require(id)` calls require as a constructor: an object or function
// module.exports passes through, anything else yields a fresh instance
import { tag } from "./member";

function constructPrimitive() {
	return new require("./primitive-exports");
}

function constructObject() {
	return new require("./object-exports");
}

it("should absorb both require() targets into the concatenation", () => {
	expect(tag).toBe("member");
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	const absorbed = concatModules[0].modules.map((m) => m.name);
	expect(absorbed).toContain("./primitive-exports.js");
	expect(absorbed).toContain("./object-exports.js");
});

it("should discard a primitive module.exports and yield a fresh instance", () => {
	const value = constructPrimitive();
	expect(typeof value).toBe("object");
	expect(value).not.toBe(42);
});

it("should pass an object module.exports through unchanged", () => {
	expect(constructObject()).toEqual({ v: "object" });
});
