export const calls = [];

export function read() {
	return [value, zero, callback()];
}

export let value = (calls.push("first"), (calls.push("second"), 42));
export let zero = (42, 1, 0);
export let callback =
	(0,
	function () {
		return value;
	});

export function bump() {
	value++;
	zero++;
	callback = () => value * 2;
}
