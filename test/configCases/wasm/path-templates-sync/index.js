"use strict";

const path = require('path');
const fs = require('fs');

it("should use path template for sync wasm modules", function() {
	return import("./module").then(function() {
        const statsPath = path.join(
            __dirname,
            "stats.json"
        );
        const stats = JSON.parse(fs.readFileSync(statsPath));
        // this checks that the wasm output filename is correct
        const names = stats.assets.map(asset => asset.name);
        expect(names).toMatchSnapshot();
	});
});
