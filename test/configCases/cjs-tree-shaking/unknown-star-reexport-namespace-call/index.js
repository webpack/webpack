import * as ns from "./barrel";
import { bUsed } from "./barrel";

it("should only reference the called export of a namespace with unknown star reexports", () => {
	expect(ns.fromCjs()).toBe("cjs");
	expect(bUsed).toBe(false);
});
