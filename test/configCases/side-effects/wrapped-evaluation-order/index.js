import "./reset";
import { value } from "./pure-cjs";
import * as namespace from "./pure-cjs-namespace";
import { reexported } from "./barrel";
import { value as esmValue } from "./pure-esm";
import { read } from "./pure-esm-importer";
import { readEsm, readImporter } from "./requirer";
import "./setup";

it("should evaluate a side-effect-free CommonJS module at its import", () => {
	expect(value).toBe("undefined");
	expect(namespace.value).toBe("undefined");
});

it("should evaluate a side-effect-free CommonJS module at its re-export", () => {
	expect(reexported).toBe("undefined");
});

it("should evaluate a side-effect-free wrapped ES module at its import", () => {
	expect(esmValue).toBe("undefined");
	expect(readEsm()).toBe("undefined");
});

it("should evaluate the imports of a wrapped module with it", () => {
	expect(read()).toBe("undefined");
	expect(readImporter()).toBe("undefined");
});
