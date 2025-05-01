/** @typedef {import("../../../../").Module} Module */

/** @type {import("../../../../").LoaderDefinition<{}, { shouldReplace: boolean }>} */
module.exports = function (source) {
	if (this.shouldReplace) {
		/** @type {NonNullable<Module["buildInfo"]>} */
		(
			/** @type {Module} */
			(this._module).buildInfo
		)._isReplaced = true;
		return "module.exports = { foo: { foo: 'bar' }, doThings: (v) => v}";
	}
	return source;
};
