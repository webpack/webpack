import "./changing";

it("should keep an existing entry connected when a new entry shares its module", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf8");
	expect(read("first.js")).toContain("__sharedMarker");
	if (WATCH_STEP !== "0") {
		expect(read("second.js")).toContain("__sharedMarker");
	}
});
