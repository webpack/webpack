import "./x";
import "./y";
import "./a";
import { log } from "./tracker";

it("import-order-11617: should evaluate import in the correct order", function () {
	expect(log).toEqual(["b", "c", "a"]);
});
