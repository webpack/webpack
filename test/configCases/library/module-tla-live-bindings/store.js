export let count = 0;
export let otherCount = 0;
export { count as alias, count as default };
export function increment() {
	return count++;
}
export function nested() {
	return (otherCount = count++);
}
export function assign(value) {
	return (count = value);
}
export function destructure(value, observe) {
	let other;
	({ count, other = observe() } = value);
	return other;
}
export function iterate(values, observe) {
	for (count of values) observe();
}
export function shadow(count) {
	return ++count;
}

export let callable;
export function replaceCallable() {
	callable = () => 42;
}
export function defaultCallable() {
	({ callable = function () {} } = {});
}
export async function incrementLater() {
	await Promise.resolve();
	count += 2;
}
export function partialAssignment() {
	[count, ...null.value] = [20];
}

export function renderedValue() {
 return "before rendering";
}

let late = 1;
export function updateLate() {
 return ++late;
}
export { late };
export const fixed = 42;
export function assignFixed() {
 fixed = 0;
}
export function patternTwice() {
 [count] = [30];
 return ++count;
}
export function keys(object, observe) {
 for (count in object) observe();
}
export function defaultClass() {
 ({ callable = class {} } = {});
}

let __webpack_exports__ = 1;
export { __webpack_exports__ as collision };
export function updateCollision() {
 return __webpack_exports__++;
}
