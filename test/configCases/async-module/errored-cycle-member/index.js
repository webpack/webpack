it("should reject a fulfilled cycle member with the cycle's evaluation error", async () => {
	// One `[[EvaluationError]]` is recorded for the whole strongly-connected
	// component, so C reports B's error even though C's own body completed.
	let errorFromB = null;
	try {
		await import("./b.js");
	} catch (err) {
		errorFromB = err;
	}
	expect(errorFromB).toBeInstanceOf(Error);
	expect(errorFromB.message).toBe("async error in B");

	let errorFromC = null;
	try {
		await import("./c.js");
	} catch (err) {
		errorFromC = err;
	}
	expect(errorFromC).toBe(errorFromB);
});
