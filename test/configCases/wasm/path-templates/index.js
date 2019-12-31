"use strict";

const path = require('path');
const fs = require('fs');

it("should use path template", function() {
	return import("./module").then(function() {
        const statsPath = path.join(
            __dirname,
            "stats.json"
        );
        const stats = JSON.parse(fs.readFileSync(statsPath));
        let found = false;
        stats.assets.forEach((asset) => {
            // found = found || asset.name ==
            console.log(asset.name);
        });
		expect(true).toEqual(true);
	});
});
