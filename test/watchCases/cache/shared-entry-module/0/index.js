it("should keep every entry of a changed shared module connected", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const expected = `__sharedValue = ${WATCH_STEP === "0" ? 1 : 2}`;
	for (const name of ["second.js", "third.js"]) {
		const content = fs.readFileSync(path.resolve(__dirname, name), "utf8");
		expect(content).toContain(expected);
	}
});
