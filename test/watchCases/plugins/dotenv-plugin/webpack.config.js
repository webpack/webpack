"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration} */

module.exports = (env, { srcPath, testPath }) => ({
	mode: "development",
	devtool: false,
	dotenv: {
		prefix: "WEBPACK_",
		dir: srcPath,
		template: [".env", ".env.myLocal", ".env.[mode]", ".env.[mode].myLocal"]
	}
});
