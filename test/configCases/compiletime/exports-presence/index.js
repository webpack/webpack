import { NotHere as aaa } from "./aaa/index.js";
import { NotHere as bbb } from "./bbb/index.js";
import { NotHere as ccc } from "./ccc/index.js";
import { NotHere as ddd } from "./ddd/index.js";

it("should do nothing", () => {
	expect(aaa).toBe(undefined);
	expect(bbb).toBe(undefined);
	expect(ccc).toBe(undefined);
	expect(ddd).toBe(undefined);
});
