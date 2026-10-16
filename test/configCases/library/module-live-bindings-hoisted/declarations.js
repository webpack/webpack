export const greetedEarly = greet();

export function greet() {
	return "hello";
}
export class Shape {}
export function unchanged() {
	return 1;
}

export let {
	left,
	inner: [right = () => 1]
} = { left: 1, inner: [] };
export var { up } = { up: 1 };
for (var { up } of [{ up: 2 }]) {
	// the loop head declares the pattern again
}

export var aliased = 5;
{
	// a `var` renaming `URL` is one the walk reports no declarator for
	var aliased = URL;
}
export function resetAliased() {
	aliased = 5;
}

export function changeDeclarations() {
	greet = () => "bye";
	Shape = class Square {};
	left++;
	right = null;
	up++;
}
