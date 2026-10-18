export function read() {
	return count;
}
read.early = (() => {
	try {
		return read();
	} catch (err) {
		return err.name;
	}
})();
export let count = 1;
export function bump() {
	count++;
}
