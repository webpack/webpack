import * as ns from "./lib";
import { optional } from "./pure-calls";

it("should read and call namespace members through an optional link", () => {
	expect(ns.obj?.value).toBe(1);
	expect(ns.obj?.missing?.value).toBe(undefined);
	expect(ns.obj?.make(3)).toBe(3);
	expect(optional).toBe(2);
});
