import inline from "./icon.svg?inline";
import resource from "./icon.svg?resource";

it("should give each asset type the `module.generator.asset` options it takes", () => {
	// not the default `base64`, so the inherited `dataUrl` reached it
	expect(inline).toMatch(/^data:image\/svg\+xml,%3Csvg/);
	expect(resource).toMatch(/assets\/icon\.svg$/);
});
