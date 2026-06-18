it("should handle import.meta.url in URL()", () => {
	((MyURL, URL) => {
		const { href } = new MyURL("./index.css", import.meta.url);

		expect(href).toBe("https://example.com/index_css.bundle0.css");
	})(URL, function () {
		throw new Error("should not be called");
	});
});
