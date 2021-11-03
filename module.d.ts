declare namespace webpack {
	type HotEvent =
		| {
				type: "disposed";
				/** The module in question. */
				moduleId: number;
		  }
		| {
				type: "self-declined" | "unaccepted";
				/** The module in question. */
				moduleId: number;
				/** the chain from where the update was propagated. */
				chain: number[];
		  }
		| {
				type: "declined";
				/** The module in question. */
				moduleId: number;
				/** the chain from where the update was propagated. */
				chain: number[];
				/** the module id of the declining parent */
				parentId: number;
		  }
		| {
				type: "accepted";
				/** The module in question. */
				moduleId: number;
				/** the chain from where the update was propagated. */
				chain: number[];
				/** the modules that are outdated and will be disposed */
				outdatedModules: number[];
				/** the accepted dependencies that are outdated */
				outdatedDependencies: {
					[id: number]: number[];
				};
		  }
		| {
				type: "accept-error-handler-errored";
				/** The module in question. */
				moduleId: number;
				/** the module id owning the accept handler. */
				dependencyId: number;
				/** the thrown error */
				error: Error;
				/** the error thrown by the module before the error handler tried to handle it. */
				originalError: Error;
		  }
		| {
				type: "self-accept-error-handler-errored";
				/** The module in question. */
				moduleId: number;
				/** the thrown error */
				error: Error;
				/** the error thrown by the module before the error handler tried to handle it. */
				originalError: Error;
		  }
		| {
				type: "accept-errored";
				/** The module in question. */
				moduleId: number;
				/** the module id owning the accept handler. */
				dependencyId: number;
				/** the thrown error */
				error: Error;
		  }
		| {
				type: "self-accept-errored";
				/** The module in question. */
				moduleId: number;
				/** the thrown error */
				error: Error;
		  };

	interface ApplyOptions {
		ignoreUnaccepted?: boolean;
		ignoreDeclined?: boolean;
		ignoreErrored?: boolean;
		onDeclined?(callback: (info: HotEvent) => void): void;
		onUnaccepted?(callback: (info: HotEvent) => void): void;
		onAccepted?(callback: (info: HotEvent) => void): void;
		onDisposed?(callback: (info: HotEvent) => void): void;
		onErrored?(callback: (info: HotEvent) => void): void;
	}

	const enum HotUpdateStatus {
		idle = "idle",
		check = "check",
		prepare = "prepare",
		ready = "ready",
		dispose = "dispose",
		apply = "apply",
		abort = "abort",
		fail = "fail"
	}

	interface Hot {
		accept: {
			(
				modules: string | string[],
				callback?: (outdatedDependencies: string[]) => void,
				errorHandler?: (
					err: Error,
					context: { moduleId: string | number; dependencyId: string | number }
				) => void
			): void;
			(
				errorHandler: (
					err: Error,
					ids: { moduleId: string | number; module: NodeJS.Module }
				) => void
			): void;
		};
		status(): HotUpdateStatus;
		decline(module?: string | string[]): void;
		dispose(callback: (data: object) => void): void;
		addDisposeHandler(callback: (data: object) => void): void;
		removeDisposeHandler(callback: (data: object) => void): void;
		invalidate(): void;
		addStatusHandler(callback: (status: HotUpdateStatus) => void): void;
		removeStatusHandler(callback: (status: HotUpdateStatus) => void): void;
		data: object;
		check(
			autoApply?: boolean | ApplyOptions
		): Promise<(string | number)[] | null>;
		apply(options?: ApplyOptions): Promise<(string | number)[] | null>;
	}

	interface ExportInfo {
		used: boolean;
		provideInfo: boolean | null | undefined;
		useInfo: boolean | null | undefined;
	}

	interface ExportsInfo {
		[k: string]: ExportInfo & ExportsInfo;
	}

	interface Context {
		resolve(dependency: string): string | number;
		keys(): Array<string>;
		id: string | number;
		(dependency: string): unknown;
	}
}

interface ImportMeta {
	url: string;
	webpack: number;
	webpackHot: webpack.Hot;
}

declare const __resourceQuery: string;
declare var __webpack_public_path__: string;
declare var __webpack_nonce__: string;
declare const __webpack_chunkname__: string;
declare var __webpack_base_uri__: string;
declare var __webpack_runtime_id__: string;
declare const __webpack_hash__: string;
declare const __webpack_modules__: Record<string | number, NodeJS.Module>;
declare const __webpack_require__: (id: string | number) => unknown;
declare var __webpack_chunk_load__: (chunkId: string | number) => Promise<void>;
declare var __webpack_get_script_filename__: (
	chunkId: string | number
) => string;
declare var __webpack_is_included__: (request: string) => boolean;
declare var __webpack_exports_info__: webpack.ExportsInfo;
declare const __webpack_share_scopes__: Record<
	string,
	Record<
		string,
		{ loaded?: 1; get: () => Promise<unknown>; from: string; eager: boolean }
	>
>;
declare var __webpack_init_sharing__: (scope: string) => Promise<void>;
declare var __non_webpack_require__: (id: any) => unknown;
declare const __system_context__: object;

declare namespace NodeJS {
	interface Module {
		hot: webpack.Hot;
	}

	interface Require {
		ensure(
			dependencies: string[],
			callback: (require: (module: string) => void) => void,
			errorCallback?: (error: Error) => void,
			chunkName?: string
		): void;
		context(
			request: string,
			includeSubdirectories?: boolean,
			filter?: RegExp,
			mode?: "sync" | "eager" | "weak" | "lazy" | "lazy-once"
		): webpack.Context;
		include(dependency: string): void;
		resolveWeak(dependency: string): void;
		onError?: (error: Error) => void;
	}
}
