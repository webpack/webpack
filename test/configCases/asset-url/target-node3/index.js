it("should handle import.meta.url in URL()", () => {
	const {href} = new URL("./index.css", import.meta.url);

	expect(href).toBe(
		process.platform === "win32"
			? "file:///C:/index.css"
			: "file:///index.css"
	);
});
