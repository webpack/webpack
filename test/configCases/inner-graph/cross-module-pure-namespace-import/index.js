import * as ns from "./pure-source";

const pure1 = ns.pureExport1(1);
const pure2 = ns.pureExport2(1);
const pure3 = ns.pureExport3(1);
const pure4 = ns.pureExport4(1);
const pure5 = ns.pureExport5(1);
const pureDefault = ns.default(1);

const impure = ns.impureExport(2);

it("should compile successfully", () => {
	expect(ns.usedExportsOfPureSource.sort()).toEqual(
		["impureExport", "usedExportsOfPureSource"].sort()
	);
});
