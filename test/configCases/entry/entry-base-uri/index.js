const jpg = new URL("./1.jpg", import.meta.url);

it("should provide custom base uri", () => {
	expect(jpg.toString()).toBe("my-scheme://baseuri/1.jpg");
});
