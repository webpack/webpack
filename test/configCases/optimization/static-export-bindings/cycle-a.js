import { readFromB } from "./cycle-b";

export const cyclicConst = "cyclic";

export function readViaB() {
	return readFromB();
}
