import * as staticPkg from "./static-package.json" assert { type: "json" };
import * as staticPkgStr from "./static-package-str.json" assert { "type": "json" };
import * as staticPkgModuleImport from "./static-package-module-import.json" assert { type: "json" };

it("should allow async externals", async () => {
	expect(staticPkg.default.foo).toBe("static");
	expect(staticPkgStr.default.foo).toBe("static-str");
	expect(staticPkgModuleImport.default.foo).toBe("static");

	const dynamicPkg = await import("./dynamic-package.json", {
		assert: { type: "json" }
	})

	expect(dynamicPkg.default.foo).toBe("dynamic");

	const dynamicPkgStr = await import("./dynamic-package-str.json", {
		"assert": { "type": "json" }
	})

	expect(dynamicPkgStr.default.foo).toBe("dynamic-str");

	const eagerPkg = await import(/* webpackMode: "eager" */ "./eager.json", {
		assert: { type: "json" }
	});

	expect(eagerPkg.default.foo).toBe("eager");

	await import("./weak.json", {
		assert: { type: "json" }
	});
	const weakPkg = await import(/* webpackMode: "weak" */ "./weak.json", {
		assert: { type: "json" }
	});

	expect(weakPkg.default.foo).toBe("weak");

	const pkg = "pkg.json";
	const nested = await import(`./nested/${pkg}`, {
		assert: { type: "json" }
	});

	expect(nested.default.foo).toBe("context-dependency");

	const reExportPkg = await import("./re-export.js");

	expect(reExportPkg.foo).toBe("re-export");

	const dynamicPkgModuleImport = await import("./dynamic-package-module-import.json", {
		assert: { type: "json" }
	})

	expect(dynamicPkgModuleImport.default.foo).toBe("dynamic");
});

export * from "./re-export-directly.json" assert { type: "json" }
