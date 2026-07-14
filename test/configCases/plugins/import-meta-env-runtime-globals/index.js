it("should keep __webpack_require__ usable in definition values", () => {
	const env = import.meta.env;
	expect(env.REQUIRE_TYPE).toBe(typeof __webpack_require__);
	expect(import.meta.env.REQUIRE_TYPE).toBe(typeof __webpack_require__);
});
