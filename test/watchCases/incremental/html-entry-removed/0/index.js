import "./page.html";

it("should drop entries the html page stopped referencing", () => {
	const htmlEntryAssets = STATS_JSON.assets.filter((a) =>
		/^__html_/.test(a.name)
	);
	expect(htmlEntryAssets.length).toBe(WATCH_STEP === "0" ? 2 : 1);
});
