const value = require("./value");

it("falls back to the main thread for a custom inputFileSystem", () => {
	expect(value).toBe(1);
});
