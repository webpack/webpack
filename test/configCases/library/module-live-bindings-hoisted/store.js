export { early };
let early = 1;
export let counter = 0;
export let length = 0;
export let callable = () => 1;
let hidden = 1,
	visible = 2;
export { visible };

export function bump() {
	counter++;
	length += 1;
	early++;
	visible = hidden + visible;
}

export function replace() {
	callable = null;
	callable ??= function () {};
}

export function snapshot() {
	return { counter, length };
}
