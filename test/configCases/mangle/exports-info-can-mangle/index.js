import { aaa, aaaCanMangle } from "./a";
import * as b from "./b"
import { c_bbbCanMangle, c, cCanMangle } from "./c";

it("__webpack_exports_info__.xxx.canMangle should be correct", () => {
	expect(aaa).toBe("aaa");
	expect(aaaCanMangle).toBe(true);
	const { bbb, bbbCanMangle } = b;
	expect(bbb).toBe("bbb");
	expect(bbbCanMangle).toBe(false);

	expect(cCanMangle).toBe(true);
	expect(c.bbb).toBe("bbb");
	expect(c_bbbCanMangle).toBe(bbbCanMangle);
});
