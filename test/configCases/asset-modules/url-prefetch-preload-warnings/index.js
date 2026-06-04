"use strict";

// webpackPrefetch only accepts boolean true for new URL() — numeric ordering
// belongs to dynamic import / Worker chunks, not to flat asset link hints.
new URL(/* webpackPrefetch: 3 */ "./image.png", import.meta.url);
new URL(/* webpackPreload: false */ "./image.png", import.meta.url);
new URL(
	/* webpackPreload: true */
	/* webpackFetchPriority: "urgent" */
	"./image.png",
	import.meta.url
);
new URL(
	/* webpackPreload: true */
	/* webpackAs: 123 */
	"./image.png",
	import.meta.url
);
new URL(
	/* webpackPreload: true */
	/* webpackType: 123 */
	"./image.png",
	import.meta.url
);
new URL(
	/* webpackPreload: true */
	/* webpackMedia: 456 */
	"./image.png",
	import.meta.url
);

it("should compile (warnings asserted by warnings.js)", () => {});
