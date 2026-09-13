import "./b.js";
import { seen } from "./a.js";

it("should not inline when a binding read sits in a sync cycle closed by CJS", () => {
	expect(seen).toBe("ReferenceError");
});
