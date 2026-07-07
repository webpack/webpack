import fieldDisabledContext from "./context-field-disabled";
import fieldEnabledContext from "./context-field-enabled";
import importMetaFalseContext from "./context-import-meta-false";
import legacyDisabledContext from "./context-legacy-disabled";
import legacyOverriddenContext from "./context-legacy-overridden";

it("should prefer importMeta.webpackContext over importMetaContext", () => {
	expect(legacyDisabledContext).toThrow();
	expect(fieldEnabledContext).toBe("context-value");
	expect(fieldDisabledContext).toThrow();
});

it("should disable import.meta.webpackContext when importMeta is false", () => {
	expect(importMetaFalseContext).toThrow();
	// importMeta: false wins over importMetaContext: true
	expect(legacyOverriddenContext).toThrow();
});
