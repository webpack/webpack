it("should keep a var hoisted from an if without else in a removed branch", () => {
	if (false) {
		if (Math.random() > 2) {
			var hoisted = 1;
		}
	}
	expect(hoisted).toBe(undefined);
	expect(typeof hoisted).toBe("undefined");
});
