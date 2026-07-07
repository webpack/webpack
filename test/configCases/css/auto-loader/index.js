it("should keep the built-in css support off when a loader handles .css", () => {
	// The loader turns the CSS into this JS module; the built-in css type would
	// instead export an object, so this value proves auto did not enable it.
	expect(require("./style.css")).toBe("LOADED_BY_CUSTOM_LOADER");
});
