"use strict";

/**
 * @this {import("../../../helpers/createWatchLoaderBarrier").BarrierLoaderContext}
 * @param {string} source module source
 * @returns {void}
 */
module.exports = function blockingLoader(source) {
	const callback = this.async();
	if (this.watchTestBarrier) {
		this.watchTestBarrier(source, callback);
	} else {
		callback(null, source);
	}
};
