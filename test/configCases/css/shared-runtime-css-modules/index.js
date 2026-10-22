it("should load a css modules chunk that is initial for another entry", async () => {
	const { value } = await import("./feature.js");
	expect(value).toMatch(/title/);
	if (typeof document !== "undefined") {
		const links = document.getElementsByTagName("link");
		expect(links).toHaveLength(1);
		expect(links[0].rel).toBe("stylesheet");
		expect(links[0].href).toContain("shared.");
		await import("./feature.js");
		expect(document.getElementsByTagName("link")).toHaveLength(1);
	}
});
