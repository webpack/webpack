import { value } from "./assign.js";
import { seen } from "./reader.js";

it("should still resolve the public path a module reads back", () => {
	expect(value).toBe("assigned");
	expect(seen()).toBe("/from-runtime/");
});
