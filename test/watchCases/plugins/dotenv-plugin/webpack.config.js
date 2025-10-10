"use strict";

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */

module.exports = (env, { srcPath, testPath }) => ({
	mode: "development",
	devtool: false,
	dotenv: {
		prefix: "WEBPACK_",
		dir: srcPath,
		template: [".env", ".env.myLocal", ".env.[mode]", ".env.[mode].myLocal"]
	}
});
