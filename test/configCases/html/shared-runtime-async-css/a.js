it("should load a stylesheet that is initial only for another page", async () => {
	expect(document.getElementsByTagName("link")).toHaveLength(0);
	expect((await import("./b-feature.js")).value).toBe("feature");
	const links = document.getElementsByTagName("link");
	expect(links).toHaveLength(1);
	expect(links[0].href).toContain("shared.css");
	expect(getComputedStyle(document.body).getPropertyValue("color")).toBe(" red");
});
