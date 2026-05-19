import { expectCssOrder } from "./helpers";

it("orderModules: returning modules as-is yields name-sorted CSS without warnings", done => {
	expectCssOrder("name", 0, "abcde123", done);
});
