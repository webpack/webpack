import id, { module } from "./alternative-path";

it("should not duplicate modules", () => {
	expect(id).toBe("./module.js");
	expect(module).toBe("./module.js");
});
