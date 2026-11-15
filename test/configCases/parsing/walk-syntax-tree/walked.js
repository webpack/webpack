const parts = [1, ...[2, 3]];
const label = `${parts[0]}-${parts.length}`;
const flag = parts.length > 1 && label !== "";

function pick(value) {
	if (value === 1) {
		return "one";
	} else if (value === 2) {
		throw new Error("two");
	}
	return typeof value === "number" ? "many" : "none";
}

export function self() {
	return this;
}

export { parts, label, flag, pick };

export function early() {
	return 1;
	// eslint-disable-next-line no-unreachable
	var unused = 2;
	function hoistedAfter() {
		return unused;
	}
}
