/** @type {import("../../../../").LoaderDefinition<{ value: any }>} */
module.exports = function (source) {
	const options = this.getOptions();
	return `${source}
;
export const __loaderValue = ${JSON.stringify(options.value)};`;
};
