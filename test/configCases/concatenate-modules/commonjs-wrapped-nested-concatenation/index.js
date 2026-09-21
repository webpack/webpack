// a nested concatenation that is imported eagerly here as well: wrapping it
// must not move it out of its own slot
import "./shared";
import { start } from "./app";

it("should not evaluate a nested concatenation before the require() reaching it", () => {
	// "settings + runtime-config" is only reachable through the lazily required
	// "feature", so the shell has to be able to run first
	expect(global.__nestedConcatOrder).toEqual([
		"shared-dep",
		"shared",
		"app"
	]);
	expect(start()).toBe(
		"api.example.test (diagnostics: api.example.test) shared:dep"
	);
	expect(global.__nestedConcatOrder).toEqual([
		"shared-dep",
		"shared",
		"app",
		"runtime-config",
		"settings",
		"legacy",
		"feature"
	]);
	delete global.__nestedConcatOrder;
});
