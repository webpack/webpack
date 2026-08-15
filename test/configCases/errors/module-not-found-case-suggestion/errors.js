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
		/'\.\/subDir\/nested\.js' exists and differs from the request only in casing/
	],
	[
		/Can't resolve '\.\/subdir\/nested'/,
		/Did you mean '\.\/subDir\/nested\.js'\?/,
		/'\.\/subDir\/nested\.js' exists and differs from the request only in casing/
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
	// Both the package name and a directory inside it are wrongly cased
	[
		/Can't resolve 'Case-Package\/lib\/Deep\.js'/,
		/Did you mean 'case-package\/lib\/deep\.js'\?/,
		/'case-package\/lib\/deep\.js' exists and differs from the request only in casing/
	],
	[
		/Can't resolve '@Scope\/scoped-package'/,
		/Did you mean '@scope\/scoped-package'\?/,
		/'@scope\/scoped-package' exists and differs from the request only in casing/
	],
	[
		/Can't resolve '@scope\/Scoped-Package'/,
		/Did you mean '@scope\/scoped-package'\?/,
		/'scoped-package' exists in that directory and differs from the request only in casing/
	],
	// The query and fragment are part of the request, but not of what is on disk
	[
		/Can't resolve '\.\/button\.js\?raw'/,
		/Did you mean '\.\/Button\.js\?raw'\?/,
		/'Button\.js' exists in that directory/
	],
	[
		/Can't resolve '\.\/subdir\/nested\.js#top'/,
		/Did you mean '\.\/subDir\/nested\.js#top'\?/,
		/'\.\/subDir\/nested\.js' exists and differs/
	],
	[/Can't resolve '\.\/no-such-file-at-all\.js'(?![\s\S]*Did you mean)/],
	[/Can't resolve '\.\/no-such-directory\/button\.js'(?![\s\S]*Did you mean)/],
	[/Can't resolve 'no-such-package-anywhere'(?![\s\S]*Did you mean)/]
];
