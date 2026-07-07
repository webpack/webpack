it("should not break a sass-style loader chain that also covers .css", () => {
	// The built-in css type would export an object; this marker proves the loader
	// chain still owns `.css` and nothing double-processes the file.
	expect(require("./style.css")).toBe("HANDLED_BY_SASS_LIKE_CHAIN");
});
