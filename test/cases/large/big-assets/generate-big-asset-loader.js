/** @type {import("../../../../").RawLoaderDefinition<{ size: string }>} */
module.exports = function () {
	const options = this.getOptions();
	return Buffer.alloc(+options.size);
};
module.exports.raw = true;
