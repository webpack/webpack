import stylesheet from "./stylesheet";

it("should resolve relative asset urls in build-time executed modules with ESM output", () => {
	expect(stylesheet).toBe(
		'body { background: url("/public/assets/file.png"); }'
	);
});
