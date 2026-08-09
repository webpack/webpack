const value = 2;

it("should keep the incremental base across an additional seal", async () => {
	// an async chunk makes seal add runtime modules to the module set
	const { other } = await import("./other.js");

	expect(value + other).toBe(WATCH_STEP === "0" ? 11 : 12);
});
