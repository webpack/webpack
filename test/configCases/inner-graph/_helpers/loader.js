/** @type {import("../../../../").LoaderDefinition} */
module.exports = source => {
	return [
		source,
		`export const __usedExports = __webpack_exports_info__.usedExports;`
	].join("\n");
};
