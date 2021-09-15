var value = 2;

export function func({ value2 = value }) {
	return value2;
}

console.log.bind(console, value);
