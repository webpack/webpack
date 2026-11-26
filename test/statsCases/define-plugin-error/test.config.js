"use strict";

/** @import { Stats } from "../../../" */

module.exports = {
	/**
	 * @param {Stats} stats stats
	 */
	validate(stats) {
		const { errors } = stats.toJson();
		if (errors.length !== 1) {
			throw new Error(`expected exactly 1 error, got ${errors.length}`);
		}
		const { message } = errors[0];
		if (
			!message.includes(
				'DefinePlugin: failed to evaluate value for "typeof PRODUCTION"'
			)
		) {
			throw new Error(
				`error should name the failing define key, got: ${message}`
			);
		}
	}
};
