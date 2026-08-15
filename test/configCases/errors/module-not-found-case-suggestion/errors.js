"use strict";

module.exports = [
	[
		/Can't resolve '\.\/button\.js'/,
		/Did you mean '\.\/Button\.js'\?/,
		/'Button\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve '\.\/button'/,
		/Did you mean '\.\/Button\.js'\?/,
		/'Button\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve '\.\/subdir\/nested\.js'/,
		/Did you mean '\.\/subDir\/nested\.js'\?/,
		/differs from the request only in the casing of a directory name/
	],
	[
		/Can't resolve '\.\/subdir\/nested'/,
		/Did you mean '\.\/subDir\/nested\.js'\?/,
		/'nested\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve 'Case-Package'/,
		/Did you mean 'case-package'\?/,
		/'case-package' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve 'case-package\/Helper\.js'/,
		/Did you mean 'case-package\/helper\.js'\?/,
		/'helper\.js' exists in that directory and differs from the request only in casing/
	],
	// Nothing on disk is close to it under any casing
	[/Can't resolve 'no-such-package-anywhere'(?![\s\S]*Did you mean)/]
];
