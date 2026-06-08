import { value } from "./shared";

export function getV() {
	return value;
}
---
const p = import(/* webpackChunkName: "lazy" */ "./shared");

export function getV() {
	return p.then((m) => m.value);
}
