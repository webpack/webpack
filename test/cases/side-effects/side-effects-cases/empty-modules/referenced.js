import "./module";
import "./cjs";
import { unusedExport } from "./pure";
export { unusedExport } from "./pure";

export function unused() {
	return unusedExport;
}
