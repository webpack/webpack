/** @type {import("../../../../").RawLoaderDefinition<{ count: string }>} */
module.exports = function () {
	const options = this.getOptions();
	return `import thing from "./module";
export default [${Array.from({ length: +options.count }, () => "thing").join(
		", "
	)}].reduce((a, b) => a + b);`;
};
