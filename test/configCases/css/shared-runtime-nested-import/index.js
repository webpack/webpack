it("should load a stylesheet that is initial for another entry through a nested import()", async () => {
	const { value } = await (await import("./lazy.js")).load();
	expect(value).toBe("shared-feature");
	if (typeof document !== "undefined") {
		const links = document.getElementsByTagName("link");
		expect(links).toHaveLength(1);
		expect(links[0].href).toContain("shared.");
		expect(getComputedStyle(document.body).getPropertyValue("color")).toBe(
			" red"
		);
		await (await import("./lazy.js")).load();
		expect(document.getElementsByTagName("link")).toHaveLength(1);
	}
});
