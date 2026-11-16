"use strict";

// The resolver reads the whole manifest URL as one file name, so it reports
// it missing.
module.exports = [
	[/Can't resolve '(?:\\x00)?!\.\/changer\.js(?:\\x00)?!\.\/icon\.svg'/]
];
