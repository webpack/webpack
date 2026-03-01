it("should error loadModule when a cycle with 2 modules is requested", () => {
	const errorMessage = require("./loader!./2/a");
	// Verify the complete error message structure - full message pattern with newlines
	expect(errorMessage).toMatch(
		/^source: err: There is a circular build dependency, which makes it impossible to create this module[\s\n]+Circular dependency detected[\s\n]+Circular dependency chain:[\s\n]+\s*→\s+.*\/2\/a\.json(\s+\(line\s+\d+\))?[\s\n]+\s*→\s+.*\/2\/b\.json(\s+\(line\s+\d+\))?[\s\n]+\s*↻\s+.*\/2\/a\.json(\s+\(line\s+\d+\))?[\s\n]+To fix this circular dependency:[\s\n]+\s*- Extract shared code from .*\/2\/a\.json and .*\/2\/b\.json to a separate module[\s\n]+\s*- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)[\s\n]+\s*- Consider refactoring the module structure to remove the dependency cycle/
	);
	// Also verify individual components for clarity
	expect(errorMessage).toMatch(
		/^source: err: There is a circular build dependency, which makes it impossible to create this module/
	);
	expect(errorMessage).toMatch(/Circular dependency detected/);
	expect(errorMessage).toMatch(/Circular dependency chain:/);
	expect(errorMessage).toMatch(/\s*→\s+.*\/2\/a\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/\s*→\s+.*\/2\/b\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/\s*↻\s+.*\/2\/a\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/To fix this circular dependency:/);
	expect(errorMessage).toMatch(
		/- Extract shared code from .*\/2\/a\.json and .*\/2\/b\.json to a separate module/
	);
	expect(errorMessage).toMatch(
		/- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)/
	);
	expect(errorMessage).toMatch(
		/- Consider refactoring the module structure to remove the dependency cycle/
	);
});
it("should error loadModule when a cycle with 3 modules is requested", () => {
	const errorMessage = require("./loader!./3/a");
	// Verify the complete error message structure - full message pattern with newlines
	expect(errorMessage).toMatch(
		/^source: source: err: There is a circular build dependency, which makes it impossible to create this module[\s\n]+Circular dependency detected[\s\n]+Circular dependency chain:[\s\n]+\s*→\s+.*\/3\/a\.json(\s+\(line\s+\d+\))?[\s\n]+\s*→\s+.*\/3\/b\.json(\s+\(line\s+\d+\))?[\s\n]+\s*→\s+.*\/3\/c\.json(\s+\(line\s+\d+\))?[\s\n]+\s*↻\s+.*\/3\/a\.json(\s+\(line\s+\d+\))?[\s\n]+To fix this circular dependency:[\s\n]+\s*- Extract shared code from the modules to a separate module[\s\n]+\s*- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)[\s\n]+\s*- Consider refactoring the module structure to remove the dependency cycle/
	);
	// Also verify individual components for clarity
	expect(errorMessage).toMatch(
		/^source: source: err: There is a circular build dependency, which makes it impossible to create this module/
	);
	expect(errorMessage).toMatch(/Circular dependency detected/);
	expect(errorMessage).toMatch(/Circular dependency chain:/);
	expect(errorMessage).toMatch(/\s*→\s+.*\/3\/a\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/\s*→\s+.*\/3\/b\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/\s*→\s+.*\/3\/c\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/\s*↻\s+.*\/3\/a\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/To fix this circular dependency:/);
	expect(errorMessage).toMatch(
		/- Extract shared code from the modules to a separate module/
	);
	expect(errorMessage).toMatch(
		/- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)/
	);
	expect(errorMessage).toMatch(
		/- Consider refactoring the module structure to remove the dependency cycle/
	);
});
it("should error loadModule when requesting itself", () => {
	const errorMessage = require("./loader!./1/a");
	// Verify the complete error message structure - full message pattern with newlines
	expect(errorMessage).toMatch(
		/^err: There is a circular build dependency, which makes it impossible to create this module[\s\n]+Circular dependency detected[\s\n]+Circular dependency chain:[\s\n]+\s*→\s+.*\/1\/a\.json(\s+\(line\s+\d+\))?[\s\n]+\s*↻\s+.*\/1\/a\.json(\s+\(line\s+\d+\))?[\s\n]+To fix this circular dependency:[\s\n]+\s*- Extract shared code from the modules to a separate module[\s\n]+\s*- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)[\s\n]+\s*- Consider refactoring the module structure to remove the dependency cycle/
	);
	// Also verify individual components for clarity
	expect(errorMessage).toMatch(
		/^err: There is a circular build dependency, which makes it impossible to create this module/
	);
	expect(errorMessage).toMatch(/Circular dependency detected/);
	expect(errorMessage).toMatch(/Circular dependency chain:/);
	expect(errorMessage).toMatch(/\s*→\s+.*\/1\/a\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/\s*↻\s+.*\/1\/a\.json(\s+\(line\s+\d+\))?/);
	expect(errorMessage).toMatch(/To fix this circular dependency:/);
	expect(errorMessage).toMatch(
		/- Extract shared code from the modules to a separate module/
	);
	expect(errorMessage).toMatch(
		/- Use dynamic imports: import\('\.\/module'\)\.then\(\.\.\.\)/
	);
	expect(errorMessage).toMatch(
		/- Consider refactoring the module structure to remove the dependency cycle/
	);
});
