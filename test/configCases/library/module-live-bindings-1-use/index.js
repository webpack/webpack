import * as single from "lib-single";
import * as singleProd from "lib-single-prod";
import * as runtime from "lib-runtime";
import * as runtimeProd from "lib-runtime-prod";

/**
 * @param {EXPECTED_ANY} ns imported library namespace
 * @param {string} label variant label
 */
function checkLiveBindings(ns, label) {
	it(`should expose live bindings for all export kinds (${label})`, () => {
		// Initial values across every export kind.
		expect(ns.mutLet).toBe(0);
		expect(ns.mutVar).toBe(1);
		expect(ns.constVal).toBe("const");
		expect(ns.aliased).toBe(0);
		expect(ns.depCount).toBe(0);
		expect(ns.starCount).toBe(0);
		expect(ns.fn()).toBe("fn");
		expect(new ns.Cls().value()).toBe("cls");
		expect(ns.default()).toBe("def");

		// Mutations are observed live through the namespace, including across
		// direct exports, aliases, named re-exports and `export *`.
		ns.mutate();
		expect(ns.mutLet).toBe(1);
		expect(ns.mutVar).toBe(2);
		expect(ns.aliased).toBe(1);
		expect(ns.depCount).toBe(1);
		expect(ns.starCount).toBe(1);
	});
}

checkLiveBindings(single, "single chunk");
checkLiveBindings(singleProd, "single chunk, production");
checkLiveBindings(runtime, "separate runtime chunk");
checkLiveBindings(runtimeProd, "separate runtime chunk, production");
