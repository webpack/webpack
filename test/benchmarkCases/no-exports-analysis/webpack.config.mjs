/** @import { Configuration } from "../../.." */

/** @type {Configuration} */
export default {
	entry: "./index",
	optimization: {
		providedExports: false,
		usedExports: false,
		sideEffects: false,
		mangleExports: false,
		innerGraph: false
	}
};
