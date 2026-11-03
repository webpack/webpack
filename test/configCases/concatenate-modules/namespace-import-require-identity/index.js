import { namespace, required } from "./importer";

it(`[${VARIANT}] gives import * as and require() one namespace object`, () => {
	expect(required()).toBe(namespace);
	expect(Object.keys(namespace).sort()).toEqual(["other", "value"]);
	expect(namespace.value()).toBe("esm");
	expect(required().other()).toBe("other");
});
