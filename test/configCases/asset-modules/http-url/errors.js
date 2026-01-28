"use strict";

module.exports = [
	[
		/http:\/\/localhost:9990\/index\.css\?cache used to have no-cache lockfile entry and has content now, but lockfile is frozen/
	],
	[
		/http:\/\/localhost:9990\/index\.css\?no-cache has a lockfile entry and is no-cache now, but lockfile is frozen/
	],
	[
		/http:\/\/localhost:9990\/index\.css has an outdated lockfile entry, but lockfile is frozen/
	],
	[/http:\/\/localhost:9990\/resolve\.js integrity mismatch/],
	[
		/http:\/\/localhost:9990\/fallback\.js has no lockfile entry and lockfile is frozen/
	],
	[
		/http:\/\/localhost:9990\/redirect has an outdated lockfile entry, but lockfile is frozen/
	],
	[
		/Module not found: Error: http:\/\/localhost:9990@127\.0\.0\.1:9100\/secret\.js doesn't match the allowedUris policy/
	]
];
