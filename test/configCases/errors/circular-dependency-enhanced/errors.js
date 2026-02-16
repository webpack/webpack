"use strict";

module.exports = [
	[
		// Verify the complete error message structure - full message pattern with newlines
		/There is a circular build dependency, which makes it impossible to create this module[\s\n]+Circular dependency detected[\s\n]+Circular dependency chain:[\s\n]+\s*→\s+.*moduleA\.js(\s+\(line\s+\d+\))?[\s\n]+\s*→\s+.*moduleB\.js(\s+\(line\s+\d+\))?[\s\n]+\s*↻\s+.*moduleA\.js(\s+\(line\s+\d+\))?[\s\n]+To fix this circular dependency:[\s\n]+\s*- Extract shared code from .*moduleA\.js and .*moduleB\.js to a separate module[\s\n]+\s*- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)[\s\n]+\s*- Consider refactoring the module structure to remove the dependency cycle/,
		// Also verify individual components for clarity
		/There is a circular build dependency, which makes it impossible to create this module/,
		/Circular dependency detected/,
		/Circular dependency chain:/,
		/\s*→\s+.*moduleA\.js(\s+\(line\s+\d+\))?/,
		/\s*→\s+.*moduleB\.js(\s+\(line\s+\d+\))?/,
		/\s*↻\s+.*moduleA\.js(\s+\(line\s+\d+\))?/,
		/To fix this circular dependency:/,
		/- Extract shared code from .*moduleA\.js and .*moduleB\.js to a separate module/,
		/- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)/,
		/- Consider refactoring the module structure to remove the dependency cycle/
	]
];

