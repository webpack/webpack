import fieldDisabledContext from "./context-field-disabled";
import fieldEnabledContext from "./context-field-enabled";
import legacyDisabledContext from "./context-legacy-disabled";

it("should prefer importMeta.webpackContext over importMetaContext", () => {
	expect(legacyDisabledContext).toThrow();
	expect(fieldEnabledContext).toBe("context-value");
	expect(fieldDisabledContext).toThrow();
});
