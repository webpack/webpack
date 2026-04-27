const namedExports = process.env.NAMED_EXPORTS === true;

// Mangled CSS class names: short identifiers, allowed CSS class chars only
const SHORT_HASH = /^[A-Za-z0-9_-]+$/;

const expectMangled = (value) => {
	expect(typeof value).toBe("string");
	expect(value).toMatch(SHORT_HASH);
	expect(value.length).toBeLessThan(20);
};

// With namedExports: false the keys live on the default export.
// With namedExports: true the keys live on the namespace itself.
const pick = (m) => (namedExports ? m : m.default);

const matrixTitle = `output.module=${process.env.OUTPUT_MODULE}, namedExports=${process.env.NAMED_EXPORTS}`;

it(`should mangle CSS exports values in production for every exportsConvention (${matrixTitle})`, (done) => {
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
			expectMangled(asIs["btn-info_is-disabled"]);
			expectMangled(asIs["btn--info_is-disabled_1"]);
			expectMangled(asIs.foo_bar);
			expectMangled(asIs.simple);
			expectMangled(asIs.class);
			// :export {} entries pass through verbatim, not mangled
			expect(asIs["my-btn-info_is-disabled"]).toBe("value");
			expect(asIs.foo).toBe("bar");
			// camelCase aliases are NOT created for "as-is"
			expect(asIs.btnInfoIsDisabled).toBeUndefined();
			expect(asIs.fooBar).toBeUndefined();

			// "camel-case": original AND camelCase aliases share the same mangled value
			expect(camelCase["btn-info_is-disabled"]).toBe(camelCase.btnInfoIsDisabled);
			expect(camelCase["btn--info_is-disabled_1"]).toBe(
				camelCase.btnInfoIsDisabled1
			);
			expect(camelCase.foo_bar).toBe(camelCase.fooBar);
			expectMangled(camelCase.btnInfoIsDisabled);
			expectMangled(camelCase.btnInfoIsDisabled1);
			expectMangled(camelCase.fooBar);
			expectMangled(camelCase.simple);
			expectMangled(camelCase.class);
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
			expectMangled(camelOnly.btnInfoIsDisabled);
			expectMangled(camelOnly.btnInfoIsDisabled1);
			expectMangled(camelOnly.fooBar);
			expectMangled(camelOnly.simple);
			expectMangled(camelOnly.class);
			expect(camelOnly.myBtnInfoIsDisabled).toBe("value");
			expect(camelOnly["my-btn-info_is-disabled"]).toBeUndefined();

			// "dashes": dashes -> camelCase, underscores preserved, original kept
			expect(dashes["btn-info_is-disabled"]).toBe(dashes.btnInfo_isDisabled);
			expect(dashes.foo_bar).toBeDefined();
			expectMangled(dashes.btnInfo_isDisabled);
			expectMangled(dashes.foo_bar);
			expectMangled(dashes.simple);
			expectMangled(dashes.class);
			expect(dashes["my-btn-info_is-disabled"]).toBe("value");
			expect(dashes.myBtnInfo_isDisabled).toBe("value");

			// "dashes-only": only the dashes-converted form is exported
			expect(dashesOnly.btnInfo_isDisabled).toBeDefined();
			expect(dashesOnly["btn-info_is-disabled"]).toBeUndefined();
			expectMangled(dashesOnly.btnInfo_isDisabled);
			expectMangled(dashesOnly.simple);
			expectMangled(dashesOnly.class);
			expect(dashesOnly.myBtnInfo_isDisabled).toBe("value");
			expect(dashesOnly["my-btn-info_is-disabled"]).toBeUndefined();

			done();
		})
		.catch(done);
});

it(`should expose the right namespace shape for namedExports (${matrixTitle})`, (done) => {
	import("./style.module.css?camel-case").then((mod) => {
		if (namedExports) {
			// Named exports: the camelCase identifier sits on the namespace itself
			expect(mod.btnInfoIsDisabled).toBeDefined();
			expectMangled(mod.btnInfoIsDisabled);
		} else {
			// Default-only: exports are nested under the default property
			expect(mod.default).toBeDefined();
			expect(mod.default.btnInfoIsDisabled).toBeDefined();
			expectMangled(mod.default.btnInfoIsDisabled);
		}
		done();
	}, done);
});
