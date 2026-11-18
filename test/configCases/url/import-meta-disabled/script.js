it("should emit assets referenced with import.meta.url", () => {
	const url = new URL("./data.txt", import.meta.url);
	expect(url.href).toMatch(/[0-9a-f]+\.txt$/);
	expect(require("fs").readFileSync(url, "utf8")).toBe("hello\n");
});
