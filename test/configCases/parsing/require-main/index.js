const { main } = require("./module");

it("should handle require.main", async () => {
	expect(require.main === module).toBe(true);

	expect(main).toBe(false);
});
