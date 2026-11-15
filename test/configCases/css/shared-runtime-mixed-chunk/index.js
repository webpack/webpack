it("should load the stylesheet of a mixed chunk that is initial for another entry", async () => {
	const { value } = await import("./feature.js");
	expect(value).toBe("shared-feature");
	if (typeof document !== "undefined") {
		const links = document.getElementsByTagName("link");
		expect(links).toHaveLength(1);
		expect(links[0].href).toContain("shared.");
		expect(getComputedStyle(document.body).getPropertyValue("color")).toBe(
			" red"
		);
		await import("./feature.js");
		expect(document.getElementsByTagName("link")).toHaveLength(1);
	}
});
