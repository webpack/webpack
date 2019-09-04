const matchAll = (str, regexp) => {
	const matches = [];
	let match;
	while ((match = regexp.exec(str)) !== null) {
		matches.push(match);
	}
	return matches;
};

module.exports = source => {
	return [
		source,
		`export const __usedExports = __webpack_exports_info__.usedExports;`
	].join("\n");
};
