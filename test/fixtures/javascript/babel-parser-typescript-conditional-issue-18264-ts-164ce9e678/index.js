declare const c: boolean;
declare function f(cb: () => Promise<string>): void;
export const v = c ? f(async (): Promise<string> => "x") : undefined;
c ? f(async (s: S): T => 1) : y;
