it("should keep shared modules in the registry", async () => {
	const a = await import(/* webpackChunkName: "page-a" */ "./page-a.js");
	const b = await import(/* webpackChunkName: "page-b" */ "./page-b.js");
	expect(a.run() + b.run()).toBe("AB");

	const fs = __non_webpack_require__("fs");
	for (const file of fs.readdirSync(__dirname)) {
		if (file.includes(".chunk.")) {
			expect(fs.readFileSync(`${__dirname}/${file}`, "utf-8")).not.toContain(
				"__webpack_linked_"
			);
		}
	}
});
