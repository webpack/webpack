import {
	settings,
	isSettingsObject,
	reloadNullish,
	reloadConditional
} from "./module";
import { reloadImported } from "./esm";

it("should keep a renamed self-reference apart from a following keyword", () => {
	expect(isSettingsObject()).toBe(true);
	expect(settings.reload()).toBe("reloaded");
});

it("should rename a self-reference a callee only evaluates to in place", () => {
	expect(global.selfReferenceRegExpRan).toBeUndefined();
	expect(reloadNullish()).toBe("reloaded");
	expect(reloadConditional()).toBe("reloaded");
});

it("should rename an imported binding a callee only evaluates to in place", () => {
	expect(global.importRegExpRan).toBeUndefined();
	expect(reloadImported()).toBe("reloaded");
});
