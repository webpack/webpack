import { foo, bar } from "./named.js";
import * as ns from "lib";

it("named import through a pure star passthrough chain", () => {
	expect(foo()).toBe(1);
	expect(bar()).toBe(2);
});

it("namespace import through a pure star passthrough chain", () => {
	expect(ns.foo()).toBe(1);
	expect(ns.bar()).toBe(2);
	expect(ns.baz()).toBe(3);
	expect(Object.keys(ns).sort()).toEqual(["bar", "baz", "foo"]);
});
