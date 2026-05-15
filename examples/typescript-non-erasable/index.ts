// This example uses syntax that Node.js's built-in `stripTypeScriptTypes`
// rejects (enums, parameter-property constructors, namespaces) — i.e. it
// goes beyond the "erasable" subset enforced by tsconfig's
// `erasableSyntaxOnly`. Projects that rely on these features still need a
// real TypeScript transpiler such as `ts-loader` or `swc-loader`.

enum Role {
	Admin = "admin",
	Editor = "editor",
	Viewer = "viewer"
}

class User {
	constructor(
		public readonly name: string,
		public readonly role: Role
	) {}

	describe(): string {
		return `${this.name} (${this.role})`;
	}
}

function asArray<T>(...items: T[]): T[] {
	return [...items];
}

const users = asArray(
	new User("Alice", Role.Admin),
	new User("Bob", Role.Viewer)
);

for (const user of users) {
	console.log(user.describe());
}
