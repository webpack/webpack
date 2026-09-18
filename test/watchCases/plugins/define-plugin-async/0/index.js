it("should update async defines in watch mode", function () {
	const module = require("./module");
	expect(module).toEqual(
		nsObj({
			default: WATCH_STEP,
			type: "string"
		})
	);
});