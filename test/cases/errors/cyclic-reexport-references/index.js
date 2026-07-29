it("should fail with a ReferenceError", () => {
	expect(() => {
		// Keep exports so cyclic TDZ still throws (bare require is evaluation-only).
		void require("./cycle");
	}).toThrow();
});
