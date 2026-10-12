const value = require("./branch");

it("should stop waiting for a removed file that is no longer imported", () => {
	expect(value).toBe(WATCH_STEP === "0" ? "first" : "second");
});
