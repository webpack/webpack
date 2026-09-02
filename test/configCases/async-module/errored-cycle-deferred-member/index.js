it("should throw the cycle's evaluation error from a deferred member reached afterwards", async () => {
	// The component records one `[[EvaluationError]]`, so reaching C through a
	// deferred namespace after B failed must report it instead of C's exports.
	let errorFromB = null;
	try {
		await import("./b.js");
	} catch (err) {
		errorFromB = err;
	}
	expect(errorFromB).toBeInstanceOf(Error);
	expect(errorFromB.message).toBe("async error in B");

	// Deferring an async module still gathers its async dependencies, so both
	// the import and the namespace access can carry the component's error.
	let errorFromDeferred = null;
	try {
		const { readC } = await import("./deferred.js");
		readC();
	} catch (err) {
		errorFromDeferred = err;
	}
	expect(errorFromDeferred).toBe(errorFromB);
});
