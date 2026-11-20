it("should hash with a cache taken while plugins are applied", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const { etag, expected } = JSON.parse(
		fs.readFileSync(path.join(__dirname, "etag.json"), "utf-8")
	);
	expect(etag).toBe(expected);
});
