import { ns } from "chain/ns.js";

it("should resolve a nested namespace reexport through side-effect-free modules", () => {
	expect(ns.y).toBe(42);
});
