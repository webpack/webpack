it("should read re-exports of linked modules", async () => {
	const a = await import(/* webpackChunkName: "page-a" */ "./page-a.js");
	const b = await import(/* webpackChunkName: "page-b" */ "./page-b.js");
	const expected = ["x", "y", "p", "q", "n1", "n1,n2"];
	expect(a.run()).toEqual([expected, expected, 1]);
	expect(b.run()).toEqual([expected, expected, 1]);
});

it("should link re-exported modules and export only what other chunks read", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const shared = fs.readFileSync(
		path.join(__dirname, "chunks", "shared.chunk.mjs"),
		"utf-8"
	);
	// every re-exported module is linked, so the registry is empty
	expect(shared).toContain("__webpack_esm_modules__ = {};");
	const scope = shared;
	for (const declaration of ["const x = ", "const p = ", "const n1 = "]) {
		expect(scope).toContain(declaration);
	}
	// `unused` no importer reads stays out of the scope's exports
	const exported = scope.split("\n").find((line) => line.startsWith("export { "));
	expect(exported).not.toContain("unused");
});
