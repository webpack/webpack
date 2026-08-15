"use strict";

module.exports = [
	[
		/Can't resolve 'sibling\.js'/,
		/Did you mean 'Sibling\.js'\?/,
		/'Sibling\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve 'sibling'/,
		/Did you mean 'Sibling\.js'\?/,
		/'Sibling\.js' exists in that directory and differs from the request only in casing/
	],
	[/Can't resolve 'nothing-like-this-at-all'(?![\s\S]*Did you mean)/]
];
