"use strict";

const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

// `experiments.typescript: true` enables webpack's built-in TypeScript
// support. Internally it wires up `module.stripTypeScriptTypes` (Node.js
// >= 22.7) to strip type annotations from `.ts`, `.cts`, `.mts` files at
// build time. It also registers the matching module rules, adds `.ts` to
// `resolve.extensions`, sets up `extensionAlias` so `.js`/`.cjs`/`.mjs`
// imports also try their `.ts`/`.cts`/`.mts` siblings, and enables
// tsconfig.json resolution.
//
// `stripTypeScriptTypes` is purely a transpile step — it strips type
// annotations and does NOT type-check. We pair it with
// `fork-ts-checker-webpack-plugin`, which runs `tsc --noEmit` in a worker
// so build errors and type errors both surface at compile time, the same
// trade-off as `ts-loader { transpileOnly: true }` + `ForkTsChecker`.
//
// Limitations: only the **erasable** TypeScript subset is supported —
// `enum`, `namespace`, parameter-property constructors, decorator
// metadata, and JSX/`.tsx` are NOT handled here. For those, use
// `ts-loader` or `swc-loader` (see the `typescript-non-erasable`
// example).

/** @type {(env: "development" | "production") => import("webpack").Configuration} */
const config = (env = "development") => ({
	mode: env,
	experiments: {
		typescript: true
	},
	plugins: [new ForkTsCheckerWebpackPlugin({ async: env === "production" })]
});

module.exports = config;
