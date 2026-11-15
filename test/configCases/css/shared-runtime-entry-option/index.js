it("should load a stylesheet that is initial for an entry sharing the runtime through entry.runtime", async () => {
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
