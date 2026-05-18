import { expectCssOrder } from "./helpers";

it("orderModules: returning undefined falls back to the default import-order sort", done => {
	expectCssOrder("fallback", 2, "bcdea123", done);
});
