const Base = class {};

// Both are evaluated where the class is written, not inside its body, so each
// reads the module's `this`.
class FromHeritage extends (this === undefined ? Base : Base) {}

const name = "method";

class FromComputedKey {
	[this === undefined ? name : name]() {
		return this;
	}
}

export default [FromHeritage, FromComputedKey];
