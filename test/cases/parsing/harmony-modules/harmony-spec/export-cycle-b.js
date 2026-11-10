import { fun } from "./export-cycle-a";

export function callFun() {
	return fun();
}
