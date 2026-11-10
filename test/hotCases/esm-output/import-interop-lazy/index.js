import { load as loadStrict, loadEsm as loadStrictEsm } from "./strict.mjs";
import { load as loadLoose, loadEsm as loadLooseEsm } from "./loose.js";

it("should apply the importer's interop to a lazily compiled module", (done) => {
	const strict = loadStrict();
	const loose = loadLoose();
	const strictEsm = loadStrictEsm();
	const looseEsm = loadLooseEsm();
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			Promise.all([strict, loose, strictEsm, looseEsm]).then(
				([strictNamespace, looseNamespace, strictEsmNamespace, looseEsmNamespace]) => {
				expect([...Object.keys(strictNamespace)].sort()).toEqual([
					"default",
					"named"
				]);
				expect(strictNamespace.default).toEqual({
					__esModule: true,
					default: 42,
					named: 1
				});
				expect(strictNamespace.named).toBe(1);

				expect([...Object.keys(looseNamespace)].sort()).toEqual([
					"__esModule",
					"default",
					"named"
				]);
				expect(looseNamespace.default).toBe(42);
				expect(looseNamespace.named).toBe(1);

				// An ES module keeps its own default whatever the importer.
				expect(strictEsmNamespace.default).toBe(42);
				expect(strictEsmNamespace.named).toBe(1);
				expect(looseEsmNamespace.default).toBe(42);
				expect(looseEsmNamespace.named).toBe(1);
				done();
				}
			).catch(done);
		})
	);
});
