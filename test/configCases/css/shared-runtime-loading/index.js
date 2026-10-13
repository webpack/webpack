it("should load an async stylesheet that is initial for another entry", async () => {
	if (typeof document !== "undefined") {
		expect(document.getElementsByTagName("link")).toHaveLength(0);
	}

	const promise = import("./feature.js");
	let stylesheetLoaded = false;
	if (typeof document !== "undefined") {
		const links = document.getElementsByTagName("link");
		expect(links).toHaveLength(1);
		expect(links[0].rel).toBe("stylesheet");
		expect(links[0].href).toContain("shared-css.");
		links[0].addEventListener("load", () => {
			stylesheetLoaded = true;
		});
	}

	expect((await promise).value).toBe(42);
	if (typeof document !== "undefined") {
		expect(stylesheetLoaded).toBe(true);
		expect(getComputedStyle(document.body).getPropertyValue("color")).toBe(
			" red"
		);
		await import("./feature.js");
		expect(document.getElementsByTagName("link")).toHaveLength(1);
	}
});
