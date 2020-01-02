"use strict";

const path = require('path');
const fs = require('fs');

it("should use path template for async wasm modules", function() {
	return import("./module").then(function() {
        const statsPath = path.join(
            __dirname,
            "stats.json"
        );
        const stats = JSON.parse(fs.readFileSync(statsPath));
        let found = false;
        stats.assets.forEach((asset) => {
            found = found || !!asset.name.match(
                /^\w{20}\.\w{20}\.\w{16}\.wasm\.wat\.wat\.wasm$/
            );
        });
		expect(found).toEqual(true);
	});
});
