import { b, a, c } from "dep";

c.cc();
b.bbb();
a.aa();

import { order } from "dep/order.js";

it("should import side-effect-free modules in deterministic order (usage order)", () => {
	expect(order).toEqual(["c", "b", "a"]);
});
