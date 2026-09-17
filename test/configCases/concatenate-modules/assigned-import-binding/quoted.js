let value = 1;

export { value as "a-b" };

export function readQuoted() {
	return value;
}
