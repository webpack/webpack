type Measure<T extends number> =
  T extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 ?
  T extends 0 | 1 | 2 | 3 ?
  T extends 0 | 1 ?
  T extends 0 ?
  0 : 1 : 2 : 4 :
  number extends T ? never : 8;
type Drop1<T extends any[]> = (((..._: T) => 0) extends (a0?: any, ..._: infer R) => 0 ? R : never);
type Drop2<T extends any[]> = (((..._: T) => 0) extends (a0?: any, a1?: any, ..._: infer R) => 0 ? R : never);
type Drop4<T extends any[]> = (((..._: T) => 0) extends (a0?: any, a1?: any, a2?: any, a3?: any, ..._: infer R) => 0 ? R : never);
type Drop8<T extends any[]> = (((..._: T) => 0) extends (a0?: any, a1?: any, a2?: any, a3?: any, a4?: any, a5?: any, a6?: any, a7?: any, ..._: infer R) => 0 ? R : never);
type ConcatRev1<A extends any[], B extends any[]> = ((a0: A[0], ..._: B) => 0) extends (..._: infer R) => 0 ? R : never;
type ConcatRev2<A extends any[], B extends any[]> = ((a0: A[1], a1: A[0], ..._: B) => 0) extends (..._: infer R) => 0 ? R : never;
type ConcatRev4<A extends any[], B extends any[]> = ((a0: A[3], a1: A[2], a2: A[1], a3: A[0], ..._: B) => 0) extends (..._: infer R) => 0 ? R : never;
type ConcatRev8<A extends any[], B extends any[]> = ((a0: A[7], a1: A[6], a2: A[5], a3: A[4], a4: A[3], a5: A[2], a6: A[1], a7: A[0], ..._: B) => 0) extends (..._: infer R) => 0 ? R : never;
type ConcatRev<A extends any[], B extends any[] = []> = {
  0: B;
  1: ConcatRev<Drop1<A>, ConcatRev1<A, B>>;
  2: ConcatRev<Drop2<A>, ConcatRev2<A, B>>;
  4: ConcatRev<Drop4<A>, ConcatRev4<A, B>>;
  8: ConcatRev<Drop8<A>, ConcatRev8<A, B>>;
}[Measure<A['length']>];
type Concat<A extends any[], B extends any[] = []> = ConcatRev<ConcatRev<A>, B>;

declare module "tapable" {
	type HookCallback<R, E = Error> = (error?: E, result?: R) => void
	type TapType = "sync" | "async" | "promise";

	export interface Tap {
	  name: string;
	  type: TapType;
	  fn: Function;
	  stage: number;
	  context: boolean;
	}

	export class Hook<T extends any[], R = any> {
	  constructor(args: string[]);
	  call(...args: T): R;
	  callAsync(...args: Concat<T, [HookCallback<R>]>): void;
	  promise(...args: T): Promise<R>;
	  tap(options: string | Tap, fn: (...args: T) => R): void;
	  tapAsync(options: string | Tap, fn: (...args: Concat<T, [HookCallback<R>]>) => void): void;
		tapPromise(options: string | Tap, fn: (...args: T) => Promise<R>): void;
	  intercept(interceptor: HookInterceptor): void;
	}

	export class SyncHook<T extends any[], R> extends Hook<T, R> {}
	export class SyncBailHook<T extends any[], R> extends Hook<T, R> {}
	export class SyncLoopHook<T extends any[], R> extends Hook<T, R> {}
	export class SyncWaterfallHook<T extends any[], R> extends Hook<T, R> {}

	export class AsyncParallelHook<T extends any[], R> extends Hook<T, R> {}
	export class AsyncParallelBailHook<T extends any[], R> extends Hook<T, R> {}
	export class AsyncSeriesHook<T extends any[], R> extends Hook<T, R> {}
	export class AsyncSeriesBailHook<T extends any[], R> extends Hook<T, R> {}
	export class AsyncSeriesWaterfallHook<T extends any[], R> extends Hook<T, R> {}

	export class HookInterceptor {
	  call(...args: any[]): void;
	  loop(...args: any[]): void;
	  tap(tap: Tap): void;
	  register(tap: Tap): Tap | undefined;
	  context: boolean;
	  name: string;
	}

	export class HookMap<T extends any[], R> {
	  constructor(fn: () => Hook<T, R>);
	  get(key: string): Hook<T, R> | undefined;
	  for(key: string): Hook<T, R>;
	  tap(key: string, options: string | Tap, fn: (...args: T) => R): void;
	  tapAsync(key: string, options: string | Tap, fn: (...args: Concat<T, [HookCallback<R>]>) => void): void;
		tapPromise(key: string, options: string | Tap, fn: (...args: T) => Promise<R>): void;
	  intercept(interceptor: HookMapInterceptor<T, R>): void;
	}

	export class HookMapInterceptor<T extends any[], R> {
	  factory(key: string, hook: Hook<T, R>): Hook<T, R>;
	}

	export class MultiHook<T extends any[], R> {
	  constructor(hooks: Hook<T, R>[]);
	}
}
