import { evaluations } from "./registry";
import { loadAsync, syncExports, syncValue } from "./consumer";

it("should read a require() of a module that is also imported dynamically", () => {
	expect(syncValue).toBe("target");
});

it("should give the dynamic import the same instance the require() got", async () => {
	const namespace = await loadAsync();
	expect(namespace.default).toBe(syncExports);
	expect(namespace.value).toBe("target");
});

it("should evaluate that module exactly once", async () => {
	await loadAsync();
	expect(evaluations).toEqual(["target"]);
});
