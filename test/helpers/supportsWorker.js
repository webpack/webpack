module.exports = function supportsWebAssembly() {
	try {
		// eslint-disable-next-line node/no-unsupported-features/node-builtins
		return require("worker_threads") !== "undefined";
	} catch (e) {
		return false;
	}
};
