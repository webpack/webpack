import { mangleInfo } from "./re-exports";

const namedExports = process.env.NAMED_EXPORTS === true;

// With namedExports: false the keys live on the default export.
// With namedExports: true the keys live on the namespace itself.
const pick = (m) => (namedExports ? m : m.default);

const matrixTitle = `output.module=${process.env.OUTPUT_MODULE}, namedExports=${process.env.NAMED_EXPORTS}`;

it(`should expose the right export shape per convention (${matrixTitle})`, (done) => {
	Promise.all([
		import("./style.module.css?as-is"),
		import("./style.module.css?camel-case"),
		import("./style.module.css?camel-case-only"),
		import("./style.module.css?dashes"),
		import("./style.module.css?dashes-only")
	])
		.then(([asIsNs, camelCaseNs, camelOnlyNs, dashesNs, dashesOnlyNs]) => {
			const asIs = pick(asIsNs);
			const camelCase = pick(camelCaseNs);
			const camelOnly = pick(camelOnlyNs);
			const dashes = pick(dashesNs);
			const dashesOnly = pick(dashesOnlyNs);

			// "as-is": original CSS class names are exported, no aliases
			expect(asIs["btn-info_is-disabled"]).toBeDefined();
			expect(asIs["btn--info_is-disabled_1"]).toBeDefined();
			expect(asIs.foo_bar).toBeDefined();
			expect(asIs.simple).toBeDefined();
			expect(asIs.class).toBeDefined();
			expect(asIs["my-btn-info_is-disabled"]).toBe("value");
			expect(asIs.foo).toBe("bar");
			expect(asIs.btnInfoIsDisabled).toBeUndefined();
			expect(asIs.fooBar).toBeUndefined();

			// "camel-case": original AND camelCase aliases share the same value
			expect(camelCase["btn-info_is-disabled"]).toBe(camelCase.btnInfoIsDisabled);
			expect(camelCase["btn--info_is-disabled_1"]).toBe(
				camelCase.btnInfoIsDisabled1
			);
			expect(camelCase.foo_bar).toBe(camelCase.fooBar);
			expect(camelCase.foo).toBe("bar");
			expect(camelCase["my-btn-info_is-disabled"]).toBe("value");
			expect(camelCase.myBtnInfoIsDisabled).toBe("value");

			// "camel-case-only": only the camelCase form exists
			expect(camelOnly.btnInfoIsDisabled).toBeDefined();
			expect(camelOnly.btnInfoIsDisabled1).toBeDefined();
			expect(camelOnly.fooBar).toBeDefined();
			expect(camelOnly["btn-info_is-disabled"]).toBeUndefined();
			expect(camelOnly["btn--info_is-disabled_1"]).toBeUndefined();
			expect(camelOnly.foo_bar).toBeUndefined();
			expect(camelOnly.myBtnInfoIsDisabled).toBe("value");
			expect(camelOnly["my-btn-info_is-disabled"]).toBeUndefined();

			// "dashes": dashes -> camelCase, underscores preserved, original kept
			expect(dashes["btn-info_is-disabled"]).toBe(dashes.btnInfo_isDisabled);
			expect(dashes.foo_bar).toBeDefined();
			expect(dashes["my-btn-info_is-disabled"]).toBe("value");
			expect(dashes.myBtnInfo_isDisabled).toBe("value");

			// "dashes-only": only the dashes-converted form is exported
			expect(dashesOnly.btnInfo_isDisabled).toBeDefined();
			expect(dashesOnly["btn-info_is-disabled"]).toBeUndefined();
			expect(dashesOnly.myBtnInfo_isDisabled).toBe("value");
			expect(dashesOnly["my-btn-info_is-disabled"]).toBeUndefined();

			done();
		})
		.catch(done);
});

it(`should expose default export when namedExports is disabled (${matrixTitle})`, (done) => {
	import("./style.module.css?camel-case").then((mod) => {
		if (namedExports) {
			// Named exports: the camelCase identifier sits on the namespace
			expect(mod.btnInfoIsDisabled).toBeDefined();
		} else {
			// Default-only mode: exports are nested under `default`
			expect(mod.default).toBeDefined();
			expect(mod.default.btnInfoIsDisabled).toBeDefined();
		}
		done();
	}, done);
});

it(`should mark JS named exports as mangleable in production for every convention (${matrixTitle})`, () => {
	// Webpack records `canMangle: true` for every CSS named export (see
	// CssIcssExportDependency.getExports). Combined with
	// mangleExports: "deterministic" + production, this means the JS
	// export identifiers themselves — not the CSS class values — get
	// mangled in the bundle output.
	//
	// This holds regardless of the `namedExports` parser option: that
	// option only controls the module's surface (named vs default-only),
	// not the underlying ExportInfo's mangleability.
	expect(mangleInfo.asIs.simple).toBe(true);
	expect(mangleInfo.asIs.foo_bar).toBe(true);
	expect(mangleInfo.asIs.fromExportBlock).toBe(true);

	expect(mangleInfo.camelCase.alias).toBe(true);
	expect(mangleInfo.camelCase.fooBar).toBe(true);
	expect(mangleInfo.camelCase.simple).toBe(true);
	expect(mangleInfo.camelCase.fromExportBlock).toBe(true);

	expect(mangleInfo.camelCaseOnly.alias).toBe(true);
	expect(mangleInfo.camelCaseOnly.fooBar).toBe(true);
	expect(mangleInfo.camelCaseOnly.simple).toBe(true);

	expect(mangleInfo.dashes.alias).toBe(true);
	expect(mangleInfo.dashes.simple).toBe(true);

	expect(mangleInfo.dashesOnly.alias).toBe(true);
	expect(mangleInfo.dashesOnly.simple).toBe(true);
});
