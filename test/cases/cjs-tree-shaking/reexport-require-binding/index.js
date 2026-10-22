import { ns as whole } from "./reexport-whole";
import { ns as viaSpecifier } from "./reexport-specifier";
import { picked, flag } from "./partial";
import { ns as viaExports, a, lazy } from "./reexport-cjs";

it("should keep the whole exports object when an `export const` require binding is re-exported (#21135)", () => {
	expect(whole.a).toBe("a");
	expect(whole.b).toBe("b");
	// Re-exporting the binding lets the value escape, so nothing may be shaken.
	expect(whole.usedExports).toBe(true);
});

it("should keep the whole exports object when a require binding is re-exported via a specifier (#21135)", () => {
	expect(viaSpecifier.a).toBe("a");
	expect(viaSpecifier.b).toBe("b");
	expect(viaSpecifier.usedExports).toBe(true);
});

it("should still tree-shake when only specific members of a require binding are re-exported", () => {
	expect(picked).toBe("a");
	// `b` is never touched, so it is shaken out of the required module.
	expect(flag).toEqual(["a", "usedExports"]);
});

it("should tree-shake a require binding assigned to CommonJS exports", () => {
	expect(viaExports.a).toBe("a");
	expect(a).toBe("a");
	expect(lazy.a).toBe("a");
	// The binding is re-exported, so only reads through the re-export count.
	expect(viaExports.usedExports).toEqual(["a", "usedExports"]);
});

it("should not re-export through a getter whose parameter or name shadows the binding", () => {
	const shadowed = require("./reexport-cjs-shadowed");
	expect(shadowed.ns.a).toBe("a");
	expect(typeof shadowed.namedGetter).toBe("function");
	expect(shadowed.paramGetter).toBe("param");
});

it("should keep the descriptor attributes of a require binding re-export", () => {
	const descriptor = require("./reexport-cjs-descriptor");
	const attributes = Object.getOwnPropertyDescriptor(descriptor, "attributes");
	expect(attributes.value.a).toBe("a");
	expect(attributes.enumerable).toBe(true);
	expect(attributes.writable).toBe(true);
	expect(attributes.configurable).toBe(true);
	const hidden = Object.getOwnPropertyDescriptor(descriptor, "hidden");
	expect(hidden.get().a).toBe("a");
	expect(hidden.enumerable).toBe(false);
});

it("should keep async and generator getters returning their wrappers", async () => {
	const descriptor = require("./reexport-cjs-descriptor");
	const fromAsync = descriptor.asyncGetter;
	expect(fromAsync).toBeInstanceOf(Promise);
	expect((await fromAsync).a).toBe("a");
	const iterator = descriptor.generatorGetter;
	expect(typeof iterator.next).toBe("function");
	expect(iterator.next().value.a).toBe("a");
});
