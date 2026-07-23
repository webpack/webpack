import * as def from "./style.module.css?default";
import * as globals from "./style.module.css?globals";
import * as camel from "./style.module.css?globals-camel";

it("should not export global names by default", () => {
	// Only local selectors are exported (and still scoped); globals are absent.
	expect(Object.keys(def).sort()).toEqual(["localAnchor", "localClass"]);
	expect(def.localClass).toBe("scoped-localClass");
	expect(def.localAnchor).toBe("scoped-localAnchor");
});

it("should export global class and id names mapped to themselves when exportGlobals is enabled", () => {
	// Locals stay scoped.
	expect(globals.localClass).toBe("scoped-localClass");
	expect(globals.localAnchor).toBe("scoped-localAnchor");
	// Globals are exported unscoped (name maps to itself).
	expect(globals.globalClass).toBe("globalClass");
	expect(globals.globalId).toBe("globalId");
	expect(globals.bareGlobal).toBe("bareGlobal");
	expect(globals.nestedGlobal).toBe("nestedGlobal");
});

it("should apply exportsConvention to exported global names", () => {
	// Both the as-is and camel-cased keys resolve to the unscoped global name.
	expect(camel["global-foo-bar"]).toBe("global-foo-bar");
	expect(camel.globalFooBar).toBe("global-foo-bar");
	expect(camel.globalClass).toBe("globalClass");
});
