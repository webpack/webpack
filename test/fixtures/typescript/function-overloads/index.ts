function parse(value: string): number;
function parse(value: number): number
function parse(value: unknown): number {
	return Number(value);
}
export function exported(): void;
export function exported(value?: string) {}
export default function overloaded(a: string): void;
async function later(): Promise<void>;
async function later() {}
