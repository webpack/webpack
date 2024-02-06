import { aaa, aaaCanMangle } from "./a";
import * as b from "./b"

it("__webpack_exports_info__.xxx.canMangle should be correct", () => {
	expect(aaa).toBe("aaa");
	expect(aaaCanMangle).toBe(true);
	const { bbb, bbbCanMangle } = b;
	expect(bbb).toBe("bbb");
	expect(bbbCanMangle).toBe(false);
});
