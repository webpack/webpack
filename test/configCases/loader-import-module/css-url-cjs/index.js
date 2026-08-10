import stylesheet from "./stylesheet";

it("should resolve asset urls in build-time executed modules with CommonJS output", () => {
	expect(stylesheet).toBe(
		'body { background: url("webpack://app/public/assets/file.png"); }'
	);
});
