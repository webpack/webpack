import img from "#internal";

it("should allow to use an URL started with '#'", () => {
	const url = new URL("#test", import.meta.url);
	expect(url.hash).toBe("#test");
});

it("should allow to use an URL started with '#'", () => {
	expect(img).toEndWith("path/images/file.png");
});
