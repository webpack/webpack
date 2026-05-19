import { expectCssOrder } from "./helpers";

it("orderModules: SyncBailHook short-circuits at the first tap that returns a value", done => {
	expectCssOrder("multi-tap", 3, "abcde123", done);
});
