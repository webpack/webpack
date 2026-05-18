import { expectCssOrder } from "./helpers";

it("orderModules: a tap can pin a specific file (e.css) to the front", done => {
	expectCssOrder("priority", 1, "eabcd123", done);
});
