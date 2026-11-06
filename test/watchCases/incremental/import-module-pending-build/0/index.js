const generated = require("./consumer.generated");
const runtime = require("./execute.js");

it("should await pending builds when importModule first runs during a rebuild", () => {
	expect(generated).toBe(WATCH_STEP === "0" ? "first" : "new");
	expect(runtime).toBe(WATCH_STEP === "0" ? "old" : "new");
});
