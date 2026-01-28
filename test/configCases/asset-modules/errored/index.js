it("should use a valid output path", () => {
	try {
		new URL("./style.css", import.meta.url);
	} catch (e) {
		// Nothing
	}
});
