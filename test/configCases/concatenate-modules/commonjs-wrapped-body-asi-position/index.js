import { report } from "./body";

it("should keep every semicolon-free require form a separate statement", () => {
	expect(report()).toEqual(["body", "side", "ctor", "plain"]);
});
