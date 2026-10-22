const value = require("./value.generated");
const step = require("./step");

it("should invalidate loader imports when resolution changes", () => {
	expect(step).toBe(+WATCH_STEP);
	expect(value).toBe(step < 2 ? "directory" : "file");
});
