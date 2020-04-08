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
        // this checks that the wasm output filename is correct
        const found = stats.assets.some((asset) => {
            return !!asset.name.match(
                /^\w{20}\.\w{20}\.\w{16}\.wasm\.wat\.wat\.wasm$/
            );
        });
        expect(found).toEqual(true);
	});
});
