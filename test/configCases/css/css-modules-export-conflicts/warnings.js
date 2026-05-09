"use strict";

module.exports = [
	[
		/Conflicting CSS module export "foo": already declared as class at line 3:1, redeclared as custom property/
	],
	[
		/Conflicting CSS module export "bar": already declared as class at line 11:1, redeclared as @keyframes/
	],
	[
		/Conflicting CSS module export "baz": already declared as class at line 24:1, redeclared as @counter-style/
	],
	[
		/Conflicting CSS module export "qux": already declared as class at line 34:1, redeclared as :export/
	]
];
