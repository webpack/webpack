import eee from "./eee/index.js";
import fff from "./fff/index.js";

it("should resolve presence overrides correctly", () => {
	expect(eee).toBe("undefined");
	expect(fff).toBe("undefined");
});
