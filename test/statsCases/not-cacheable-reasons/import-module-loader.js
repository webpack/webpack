module.exports = async function () {
	const child = await this.importModule("./child.js");
	// a second import must not record duplicate reasons
	await this.importModule("./child.js");
	return `export default ${child.default};`;
};
