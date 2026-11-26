import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import config from "../realistic-app/webpack.config.mjs";

/** @import { Configuration } from "../../.." */

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Configuration} */
export default {
	...config,
	resolve: {
		alias: {
			"@": resolve(__dirname, "generated")
		}
	}
};
