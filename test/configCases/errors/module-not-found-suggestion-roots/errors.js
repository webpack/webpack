"use strict";

module.exports = [
	[
		/Can't resolve '\/root\.js'/,
		/Did you mean '\/Root\.js'\?/,
		/'Root\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve '\/root'/,
		/Did you mean '\/Root\.js'\?/,
		/'Root\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve '\/subdir\/nested\.js'/,
		/Did you mean '\/subDir\/nested\.js'\?/,
		/'\/subDir\/nested\.js' exists and differs from the request only in casing/
	],
	[/Can't resolve '\/nothing-like-this-at-all\.js'(?![\s\S]*Did you mean)/]
];
