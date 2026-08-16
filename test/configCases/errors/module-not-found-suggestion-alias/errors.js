"use strict";

module.exports = [
	[
		/Can't resolve '@\/button\.js'/,
		/Did you mean '@\/Button\.js'\?/,
		/'Button\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve '@\/subdir\/nested\.js'/,
		/Did you mean '@\/subDir\/nested\.js'\?/,
		/'@\/subDir\/nested\.js' exists and differs from the request only in casing/
	],
	[
		/Can't resolve '@\/Componet\.js'/,
		/Did you mean '@\/Component\.js'\?/,
		/'Component\.js' is the closest name in that directory\. It differs from the request by 1 character/
	],
	[
		/Can't resolve '~\/button\.js'/,
		/Did you mean '~\/Button\.js'\?/,
		/'Button\.js' exists in that directory and differs from the request only in casing/
	],
	// The alias never applied, so there is no directory to look in
	[/Can't resolve 'only\/button\.js'(?![\s\S]*Did you mean)/],
	// The bound stopped the search before the target that would have answered
	[/Can't resolve 'many\/button\.js'(?![\s\S]*Did you mean)/]
];
