// eslint-disable-next-line node/no-unpublished-require
const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ProvideSharedPlugin({
			shareScope: "eagerOverrideNonEager",
			provides: {
				common: {
					shareKey: "common",
					eager: true,
					prefer: "rain"
				}
			}
		}),
		new ProvideSharedPlugin({
			shareScope: "nonEagerDontOverrideEager",
			provides: {
				uncommon: {
					shareKey: "uncommon"
				}
			}
		}),
		new ProvideSharedPlugin({
			shareScope: "newerNonEager",
			provides: {
				uncommon: {
					shareKey: "uncommon",
					prefer: ["appshell-3.0", /@foo.*/]
				}
			}
		}),
		new ProvideSharedPlugin({
			shareScope: "newerEager",
			provides: {
				common: {
					shareKey: "common",
					eager: true,
					prefer: "trusty"
				}
			}
		})
	]
};
