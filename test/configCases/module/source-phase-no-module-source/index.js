/**
 * @param {Promise<EXPECTED_ANY>} promise the source phase import
 * @returns {Promise<Error>} the rejection reason
 */
async function reason(promise) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error("Expected the source phase import to be rejected");
}

it("should reject a source phase import of a module with no module source", async () => {
	const error = await reason(import.source("./plain.js"));

	expect(error).toBeInstanceOf(SyntaxError);
	expect(error.message).toContain("has no module source");
});

it("should reject an eager source phase import of such a module", async () => {
	const error = await reason(
		import.source(/* webpackMode: "eager" */ "./plain.js")
	);

	expect(error).toBeInstanceOf(SyntaxError);
});

it("should reject a weak source phase import of such a module", async () => {
	const error = await reason(
		import.source(/* webpackMode: "weak" */ "./plain.js")
	);

	expect(error).toBeInstanceOf(SyntaxError);
});

it("should reject a computed source phase import of such a module", async () => {
	const name = "other";
	const error = await reason(import.source(`./${name}.js`));

	expect(error).toBeInstanceOf(SyntaxError);
	expect(error.message).toContain("./other.js");
});

it("should keep the evaluation phase of the same module working", async () => {
	const evaluation = await import("./plain.js");

	expect(evaluation.default).toBe("default export");
	expect(evaluation.value).toBe("named export");
});
