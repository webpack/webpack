import { def, named, renamed, star, deep, mixed, local } from "lib";
import * as namespaceBarrel from "lib/namespace/index.js";

it("should resolve every requested name through a deferred barrel", () => {
	expect(def).toBe(1);
	expect(named).toBe(2);
	expect(renamed).toBe(3);
	expect(star).toBe(4);
	expect(deep).toBe(6);
	expect(mixed).toBe(8);
	expect(local).toBe(7);
});

it("should resolve a namespace import that requests every name", () => {
	expect(namespaceBarrel.ns.inner).toBe(5);
});
