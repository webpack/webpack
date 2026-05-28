// Self-cycle: const must fall back to a getter so reading via the namespace works
import * as self from "./self-const";

export const selfConst = "self";

export function readSelf() {
	return self.selfConst;
}
