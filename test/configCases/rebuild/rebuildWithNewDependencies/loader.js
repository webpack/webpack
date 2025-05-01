/** @typedef {import("../../../../").Module} Module */

/** @type {import("../../../../").LoaderDefinition<{}, { shouldReplace: boolean }>} */
module.exports = function (source) {
	if (this.shouldReplace) {
		/** @type {NonNullable<Module["buildInfo"]>} */
		(
			/** @type {Module} */
			(this._module).buildInfo
		)._isReplaced = true;
		return `import otherFile from './other-file.js';
		export default otherFile;
		`;
	}
	return source;
};
