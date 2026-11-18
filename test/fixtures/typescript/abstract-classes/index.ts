abstract class Shape {
	abstract area(): number;
	protected abstract name: string;
	abstract get size(): number;
	describe(): string {
		return this.name;
	}
}
export abstract class Exported {}
export default abstract class {}
const after = 1;
