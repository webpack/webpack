let count = 0;

export function bump() {
	count++;
	return "setup";
}

export function getBumpCount() {
	return count;
}
