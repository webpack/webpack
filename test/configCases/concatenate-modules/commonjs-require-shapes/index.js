import { esmValue } from "./esm-dep.js";

const { first, second } = require("./named-exports.js");
const templateRequire = require(`./named-exports.js`);
const contextName = "one";
const contextRequire = require(`./dir/${contextName}.js`);
const instance = new (require("./ctor.js"))();
// `new require(x)` binds the argument list to `new`, so this is the exports
// value itself -- the trailing `()` in `new require(x)()` would call it
const constructedRequire = new require("./ctor.js");

it("should read a destructured require()", () => {
	expect(esmValue).toBe("esm-dep");
	expect(first).toBe("first");
	expect(second).toBe("second");
});

it("should read a require() written as a template literal", () => {
	expect(templateRequire.first).toBe("first");
});

it("should pass the exports object as `this` to a member call", () => {
	expect(require("./named-exports.js").readThis()).toBe("this=exports");
});

it("should keep a computed request resolving at runtime", () => {
	expect(contextRequire).toBe("one");
	// the context module stays out of the concatenation, so the two requires of
	// ./named-exports.js must still share its instance
	expect(templateRequire).toBe(require("./named-exports.js"));
});

it("should construct through a parenthesized require()", () => {
	expect(instance.kind).toBe("thing");
});

it("should give `new require()` the Node.js return-value semantics", () => {
	// a function exports value passes through the `new` return-value rule
	expect(constructedRequire).toBe(require("./ctor.js"));
	// so calling it is a plain call, with no `this` -- exactly as in Node.js
	expect(() => new require("./ctor.js")()).toThrow(TypeError);
});

it("should share one instance across every require() of a module", () => {
	const a = require("./counter.js");
	const b = require("./counter.js");
	expect(a).toBe(b);
	expect(a.next()).toBe(1);
	expect(b.next()).toBe(2);
});

it("should keep a whole-module and a member alias pointing at one instance", () => {
	expect(require("./whole-alias.js")).toBe(require("./alias-target.js"));
	expect(require("./member-alias.js").tag).toBe("alias-target");
});

it("should concatenate every module with a static request", () => {
	const concatenated = new Set();
	for (const m of __STATS__.modules) {
		if (!m.modules) continue;
		for (const inner of m.modules) concatenated.add(inner.name);
	}
	for (const name of [
		"./alias-target.js",
		"./counter.js",
		"./ctor.js",
		"./esm-dep.js",
		"./index.js",
		"./member-alias.js",
		"./named-exports.js",
		"./whole-alias.js"
	]) {
		expect(concatenated).toContain(name);
	}
});
