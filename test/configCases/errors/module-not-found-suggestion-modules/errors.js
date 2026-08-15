"use strict";

module.exports = [
	[
		/Can't resolve 'widgets\/Chart\.js'/,
		/Did you mean 'Widgets\/Chart\.js'\?/,
		/'Widgets\/Chart\.js' exists and differs from the request only in casing/
	],
	[
		/Can't resolve 'Widgets\/chart\.js'/,
		/Did you mean 'Widgets\/Chart\.js'\?/,
		/'Chart\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve 'Widgets\/chart'/,
		/Did you mean 'Widgets\/Chart\.js'\?/,
		/'Chart\.js' exists in that directory and differs from the request only in casing/
	],
	[/Can't resolve 'nothing-like-this-at-all\/Chart\.js'(?![\s\S]*Did you mean)/]
];
