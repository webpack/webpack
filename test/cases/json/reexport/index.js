import { e, f, fNamed, fStar, fStarPartial, fStarPartial2 } from "./reexport";

it("should be possible to reexport json data", function() {
	expect(e.aa).toBe(1);
	expect(e.bb).toBe(2);
	expect(f).toEqual({
		named: "named",
		default: "default",
		__esModule: true
	});
	expect(fNamed).toBe("named");
	const _fStar = fStar;
	expect(_fStar).toEqual(
		nsObj({
			named: "named",
			default: { named: "named", default: "default", __esModule: true }
		})
	);
	expect(_fStar.__esModule).toBe(true);
	expect(fStarPartial.default.named).toBe("named");
	expect(fStarPartial2.named).toBe("named");
});
