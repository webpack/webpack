export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function debounce<F extends (...args: any[]) => void>(fn: F, wait = 100): (...args: Parameters<F>) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<F>): void => {
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), wait);
	};
}

export const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

export function assertNever(value: never): never {
	throw new Error(`Unexpected ${value as unknown as string}`);
}

declare global {
	interface Array<T> {
		first(): T | undefined;
	}
}

export default function merge<A extends object, B extends object>(a: A, b: B): A & B {
	return { ...a, ...b } as A & B;
}
