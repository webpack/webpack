it("should keep non-analyzable requests as runtime URLs and warn", () => {
	let dyn = "dynamic";
	const url = new URL(`./${dyn}.png`, import.meta.url);
	expect(url.href).toBe("https://test.cases/path/dynamic.png");
});
