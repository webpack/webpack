import "./index.js";

it("should define require.main", function() {
	expect(require.main).toBe(module);
});
