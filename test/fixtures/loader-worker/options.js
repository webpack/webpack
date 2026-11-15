"use strict";

/** @type {import("../../../").LoaderDefinition<{ value?: number }>} */
module.exports = function (source) {
	const options = this.getOptions({
		type: "object",
		properties: { value: { type: "number" } }
	});
	const customValue = /** @type {{ customValue?: number }} */ (
		/** @type {unknown} */ (this)
	).customValue;

	if (customValue !== 42) {
		throw new Error("compiler.options.loader did not reach the worker loader");
	}

	return `${String(source)}:${options.value}`;
};
