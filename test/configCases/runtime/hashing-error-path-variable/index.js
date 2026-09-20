it("should name the runtime module that resolved a hash too early", () => {
	// the generation for the emitted asset runs after hashing, where the hash exists
	expect(__webpack_require__.rootDir).toBe("../");
});
