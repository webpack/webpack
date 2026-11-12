import inline from "./icon.svg?inline";
import resource from "./icon.svg?resource";

it("should give each asset type the `module.generator.asset` options it takes", () => {
	expect(inline).toMatch(/^data:image\/svg\+xml;base64,/);
	expect(resource).toMatch(/assets\/icon\.svg$/);
});
