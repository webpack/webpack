import "./b.js";
import { seen } from "./a.js";
import { FLAG } from "./plain.js";

it("should not inline a const export read during its TDZ in a cycle", () => {
	expect(seen).toBe("ReferenceError");
});

it("should still inline a const export outside a cycle", () => {
	expect(FLAG).toBe(42);
});
