import pureDefault, {
	pureFn,
	pureArrow,
	impureExport,
	usedExportsOfPureSource
} from "./pure-source";

const usePureFn = pureFn(1);
const usePureArrow = pureArrow(1);
const usePureDefault = pureDefault(1);

const useImpure = impureExport(2);

it("should treat config-marked functions as side-effect-free", () => {
	expect(usedExportsOfPureSource.sort()).toEqual(
		["impureExport", "usedExportsOfPureSource"].sort()
	);
});
