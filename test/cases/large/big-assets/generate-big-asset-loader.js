/** @type {import("../../../../").RawLoaderDefinition<{ size: string }>} */
module.exports = function () {
	const options = this.getOptions();
	return Buffer.alloc(+options.size).fill(0xa5);
};
module.exports.raw = true;
