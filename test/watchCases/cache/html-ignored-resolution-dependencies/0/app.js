let value;
try {
	value = require("./optional");
} catch (_error) {
	value = "ignored";
}

it("should remove a restored late entry connection when resolution is ignored", () => {
	expect(value).toBe(WATCH_STEP === "1" || WATCH_STEP === "3" ? "enabled" : "ignored");
});
