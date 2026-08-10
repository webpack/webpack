import stylesheet from "./stylesheet";

it("should resolve asset urls in build-time executed modules with ESM output", () => {
	expect(stylesheet).toMatch(
		/^body { background: url\("webpack:\/\/app\/public\/assets\/file\.png"\); border-image: url\("data:image\/png;base64,/
	);
});
