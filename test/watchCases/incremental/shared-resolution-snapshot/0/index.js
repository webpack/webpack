const shared = require("./shared.js");
const indirect = require("./indirect.js");

it("should invalidate resolutions added after a shared module was built", () => {
	expect(shared).toBe("shared");
	expect(indirect).toBe(WATCH_STEP === "1" ? "other" : "shared");
});
