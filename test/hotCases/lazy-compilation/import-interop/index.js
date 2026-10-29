import { load as loadStrict } from "./strict.mjs";
import { load as loadLoose } from "./loose.js";

it("should apply the importer's interop to a lazily compiled module", (done) => {
	const strict = loadStrict();
	const loose = loadLoose();
	NEXT_DEFERRED(
		require("../../update")(done, true, () => {
			Promise.all([strict, loose]).then(([strictNamespace, looseNamespace]) => {
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
				done();
			}, done);
		})
	);
});
