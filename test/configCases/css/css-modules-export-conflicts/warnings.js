"use strict";

module.exports = [
	/CSS module export "class-vs-var" is shadowed by class at line 6:1: the custom property/,
	/CSS module export "var-then-class" is shadowed by class at line 17:1: the custom property/,
	/CSS module export "class-vs-keyframes" is shadowed by class at line 21:1: the @keyframes/,
	/CSS module export "class-vs-counter" is shadowed by class at line 29:1: the @counter-style/,
	/CSS module export "class-vs-container" is shadowed by class at line 38:1: the @container/,
	/Conflicting CSS module export "class-vs-export": already declared as class at line 48:1, redeclared as :export/
];
