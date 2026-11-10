let caught = null;

// the unused undefined initializer keeps inner graph's identifier purity branch covered
const unusedUndefined = undefined;

try {
	const x = NOT_DEFINED_ANYWHERE;
} catch (error) {
	caught = error;
}

it("should keep the ReferenceError an unused initializer throws", () => {
	expect(caught).not.toBe(null);
	expect(caught.name).toBe("ReferenceError");
});
