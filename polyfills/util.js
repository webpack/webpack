// inspired by https://github.com/ionic-team/rollup-plugin-node-polyfills/blob/master/polyfills/util.js

// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If NO_DEPRECATION env var is set, then it is a no-op.
// Also DEPRECATION_SEVERENESS = throw | trace | error (by default) will steer the behaviour on calls.
export function deprecate(fn, msg) {
	const noDeprecation = Deno.env("NO_DEPRECATION");
	const deprecationSevereness = Deno.env("DEPRECATION_SEVERENESS");

	if (noDeprecation) {
		return fn;
	}

	var warned = false;
	function deprecated() {
		if (!warned) {
			if (deprecationSevereness === "throw") {
				throw new Error(msg);
			} else if (deprecationSevereness === "trace") {
				console.trace(msg);
			} else {
				console.error(msg);
			}
			warned = true;
		}
		return fn.apply(this, arguments);
	}

	return deprecated;
}

// WebpackError overrides util.inspect.custom which is nodejs-specific.
export var inspect = {
	custom: null
};
