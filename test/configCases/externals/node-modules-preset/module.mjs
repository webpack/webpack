import { where } from "fake-dep";

it("externalizes node_modules packages as `import` for module output", () => {
	// stubbed at runtime by test.config.js; a bundled copy would report "package"
	expect(where).toBe("runtime");
});
