// `namespace` is non-erasable TypeScript syntax. `module.stripTypeScriptTypes`
// rejects it in strip mode, so `experiments.typescript` is expected to fail
// the build with a clear, per-module ModuleBuildError. Projects that need
// namespaces must use a real TypeScript transpiler (see the
// `examples/typescript-non-erasable` example).
namespace Test {
	export const x = 1;
}

// Unreachable: the build never reaches runtime. Keep a runtime assertion so
// the file remains valid TypeScript even though the test entry-point is the
// errors.js fixture.
const result = Test.x;

it("should not be reached", () => {
	expect(result).toBe(1);
});
