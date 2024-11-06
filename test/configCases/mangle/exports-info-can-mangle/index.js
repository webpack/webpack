import { aaa, aaaCanMangle } from "./a";
import * as b from "./b"
import { ca, cb, caCanMangle, cbCanMangle, ca_aaaCanMangle, cb_bbbCanMangle } from "./c";

it("__webpack_exports_info__.xxx.canMangle should be correct", () => {
	expect(aaa).toBe("aaa");
	expect(aaaCanMangle).toBe(true);

	const { bbb, bbbCanMangle } = b;
	expect(bbb).toBe("bbb");
	expect(bbbCanMangle).toBe(true);
	
	expect(caCanMangle).toBe(true);
	expect(cbCanMangle).toBe(true);
});

it("__webpack_exports_info__.xxx.yyy.canMangle should be correct", () => {
	expect(ca.aaa).toBe("aaa");
	expect(ca_aaaCanMangle).toBe(aaaCanMangle);

	expect(cb.bbb).toBe("bbb");
	expect(cb_bbbCanMangle).toBe(b.bbbCanMangle);
});
