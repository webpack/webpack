"use strict";

// Image encoders minimizer-webpack-plugin requires outside a try block, so
// bundling it reports each missing one as an error rather than a warning.
module.exports = [
	/Can't resolve 'sharp'/,
	/Can't resolve '@napi-rs\/image'/,
	/Can't resolve 'svgo'/
];
