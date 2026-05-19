export interface User {
	name: string;
	age: number;
}

export function greet(user: User): string {
	return `Hello, ${user.name} (${user.age})`;
}
