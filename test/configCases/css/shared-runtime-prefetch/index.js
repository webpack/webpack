it("should load a prefetched stylesheet that is initial for another entry", async () => {
	const { value } = await import(/* webpackPrefetch: true */ "./feature.js");
	expect(value).toBe("shared-feature");
	if (typeof document !== "undefined") {
		const links = document.getElementsByTagName("link");
		expect(Array.from(links, (link) => link.rel)).toContain("stylesheet");
		expect(Array.from(links, (link) => link.href).some((href) => href.includes("shared."))).toBe(true);
		expect(getComputedStyle(document.body).getPropertyValue("color")).toBe(
			" red"
		);
		await import(/* webpackPrefetch: true */ "./feature.js");
		expect(Array.from(document.getElementsByTagName("link"), (link) => link.rel).filter((rel) => rel === "stylesheet")).toHaveLength(1);
	}
});
