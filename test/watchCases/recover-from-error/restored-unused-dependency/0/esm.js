import { a as unused } from "./esm-dep";
export const a = 1;
export function f() {
	return [require("./esm-cjs"), unused];
}
