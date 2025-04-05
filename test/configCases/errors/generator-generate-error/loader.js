/** @type {import("../../../../").LoaderDefinition<{ message: string }>} */
module.exports = function() {
	const callback = this.async();
	const options = this.getOptions();

	callback(new Error(options.message || 'Message'));
};
