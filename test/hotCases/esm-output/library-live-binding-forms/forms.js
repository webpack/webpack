export let plain;
export let named = () => 1;
export let { left, right } = { left: "L", right: "R" };
export var looped = 0;
for (looped of [1, 2]) {
	// the loop's last value stays
}
export var each;
for (var each in { a: 1, b: 2 }) void each;
export var start;
for (var [start] = [7]; false; );
// renaming `URL`, the walk reports no declarator, so the export stays a copy
export const Url = URL;
export class Shape {}
export function swap() {
	plain = "set";
	[left, right] = [right, left];
	Shape = class Square {};
}
---
export let plain = "fresh";
export let named = function () {
	return 2;
};
export let { left, right } = { left: "l", right: "r" };
export var looped = 0;
for (looped of [3]) void looped;
export var each;
for (var each in { c: 1 }) {
	// the loop's last key stays
}
export var start;
for (var [start] = [8]; false; );
export const Url = URL;
export class Shape {}
export function swap() {}
