require("./tick");

it("should keep changed and newly shared entries connected", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const expected = `__sharedValue = ${WATCH_STEP === "0" ? 1 : 2}`;
	const names =
		WATCH_STEP === "3" ? ["fourth.js", "fifth.js"] : ["second.js", "third.js"];
	if (WATCH_STEP === "2") names.push("fourth.js");
	expect(STATS_JSON.assets.map((asset) => asset.name).sort()).toEqual(
		["bundle.js", ...names].sort()
	);
	for (const name of names) {
		const content = fs.readFileSync(path.resolve(__dirname, name), "utf8");
		expect(content).toContain(expected);
	}
});
