import otherStylesheet from "./other-stylesheet";
import stylesheet from "./stylesheet";

it("should resolve asset urls in build-time executed modules with ESM output", () => {
	expect(stylesheet).toMatch(
		/^body { background: url\("webpack:\/\/app\/public\/assets\/file\.png"\); border-image: url\("data:image\/png;base64,/
	);
});

it("should honor the importModule publicPath override for wrapper-less assets", () => {
	expect(otherStylesheet).toBe(
		'body { background: url("webpack://app/other/assets/file.png"); }'
	);
});

it("should emit the analyzable url form for the same asset in the bundle", () => {
	const url = new URL("./file.png", import.meta.url);
	expect(url.pathname).toBe("/public/assets/file.png");
});
