import pureDefaultExport, {
	pureExport1,
	impureExport,
	pureExport2,
	pureExport3,
	pureExport4,
	pureExport5,
	usedExportsOfPureSource
} from "./pure-source";

const pure1 = pureExport1(1);
const pure2 = pureExport2(1);
const pure3 = pureExport3(1);
const pure4 = pureExport4(1);
const pure5 = pureExport5(1);
const pureDefault = pureDefaultExport(1);

const impure = impureExport(2);

it("should compile successfully", () => {
	expect(usedExportsOfPureSource.sort()).toEqual(
		["impureExport", "usedExportsOfPureSource"].sort()
	);
});
