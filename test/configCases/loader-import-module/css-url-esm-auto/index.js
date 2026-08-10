import stylesheet from "./stylesheet";

it("should resolve asset urls against the baseUri with an auto publicPath at build time", () => {
	expect(stylesheet).toBe(
		'body { background: url("webpack://app/assets/file.png"); }'
	);
});
