const factor = 2;

export function double(value) {
	const { scale = factor } = {};
	return value * scale;
}
