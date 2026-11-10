const generated = require("./consumer.generated");
const runtime = require("./execute.js");

it("should await pending builds when importModule first runs during a rebuild", () => {
	expect(generated).toBe(WATCH_STEP === "2" ? "new" : "first");
	expect(runtime).toBe(["old", "intermediate", "new"][Number(WATCH_STEP)]);
	expect(COMPILER.options.plugins[0].completedCompilers.has(COMPILER)).toBe(
		WATCH_STEP === "2"
	);
});

it("should finish an extra rebuild after the pending import", (done) => {
	COMPILER.watching.invalidate(done);
});
