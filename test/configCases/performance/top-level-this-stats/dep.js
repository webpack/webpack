const outer = this;

// An arrow keeps the enclosing `this`, so this one counts too.
const fromArrow = (() => this)();

function classic() {
	return this;
}

export default [outer, fromArrow, classic];
