const any = value as any;
const twice = value as unknown as string[];
const satisfied = { a: 1 } satisfies Record<string, number>;
const constant = [1, 2] as const;
const chained = value as unknown as string[] satisfies readonly string[];
(target as any) = 1;
target as any = 2;
for (const key in object as Record<string, unknown>) {}
const sum = a + b as number;
const compare = a < b as boolean;
const equal = a == b as boolean;
call(a as any, b as never);
