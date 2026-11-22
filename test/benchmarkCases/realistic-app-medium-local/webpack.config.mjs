import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import config from "../realistic-app/webpack.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("../../..").Configuration} */
export default {
	...config,
	resolve: {
		alias: {
			"@": resolve(__dirname, "generated")
		}
	}
};
