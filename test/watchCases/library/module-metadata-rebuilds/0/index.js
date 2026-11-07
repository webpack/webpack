it("should reset moved and mirrored library bindings after changing exports", async () => {
	for (const name of ["library", "modern", "mirrored"]) {
		const library = await import(/* webpackIgnore: true */ `./${name}.mjs`);
		expect(Object.keys(library)).toEqual(
			WATCH_STEP === "1" ? ["read"] : ["read", "value"]
		);
		expect(library.read()).toBe(Number(WATCH_STEP) + 2);
		if (WATCH_STEP !== "1") expect(library.value).toBe(Number(WATCH_STEP) + 2);
	}
});

it("should keep exports when a library becomes asynchronous", async () => {
	const library = await import(/* webpackIgnore: true */ "./async.mjs");
	expect(library.answer).toBe(42);
});
