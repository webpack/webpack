import { PluginA, lazyValue, util } from "./barrel";

it("should statically named-import value and getter reexports from a CJS barrel", () => {
	expect(new PluginA().apply()).toBe("A");
	expect(lazyValue).toBe(42);
	expect(util.helper()).toBe("helper");
	expect(util.value).toBe(42);
});

export { PluginA, lazyValue, util };
