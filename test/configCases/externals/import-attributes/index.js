import * as staticPkg from "./static-package.json" assert { type: "json" };
import * as staticPkgStr from "./static-package-str.json" assert { "type": "json" };

it("should allow async externals", async () => {
	expect(staticPkg.default.foo).toBe("static");
	expect(staticPkgStr.default.foo).toBe("static-str");

	const dynamicPkg = await import("./dynamic-package.json", {
		assert: { type: "json" }
	})

	expect(dynamicPkg.default.foo).toBe("dynamic");

	const dynamicPkgStr = await import("./dynamic-package-str.json", {
		"assert": { "type": "json" }
	})

	expect(dynamicPkgStr.default.foo).toBe("dynamic-str");
});
