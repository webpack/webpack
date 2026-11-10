export function chunk(items, size = 1) {
	if (size < 1) throw new RangeError("chunk size must be at least 1");
	const result = [];
	for (let index = 0; index < items.length; index += size) {
		result.push(items.slice(index, index + size));
	}
	return result;
}

export function groupBy(items, key) {
	const select = typeof key === "function" ? key : (item) => item[key];
	const groups = {};
	for (const item of items) {
		const group = select(item);
		(groups[group] || (groups[group] = [])).push(item);
	}
	return groups;
}

export function uniqBy(items, key) {
	const select = typeof key === "function" ? key : (item) => item[key];
	const seen = new Set();
	return items.filter((item) => {
		const value = select(item);
		if (seen.has(value)) return false;
		seen.add(value);
		return true;
	});
}
