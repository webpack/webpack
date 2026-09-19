import * as lazy from /* webpackDefer: true */ "./pure-cjs";
import { extra } from "./side.js";

export function readLazy(a, b) {
	return lazy.mul(a, b) + extra(0);
}
