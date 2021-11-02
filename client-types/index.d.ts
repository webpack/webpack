export {};

interface ExportInfo {
	used: boolean;
	provideInfo: boolean | null | undefined;
	useInfo: boolean | null | undefined;
}

interface ExportsInfo {
	[k: string]: ExportInfo & ExportsInfo
}

interface Context {
	resolve(dependency: string): string|number;
	keys(): Array<string>;
	id: string|number;
	(dependency: string): any;
}

declare global {
	interface ImportMeta {
		url: string;
		webpack: number;
		webpackHot: import("./hot").Hot;
	}

	var __resourceQuery: string;
	var __webpack_public_path__: string;
	var __webpack_nonce__: string;
	var __webpack_chunkname__: string;
	var __webpack_base_uri__: string;
	var __webpack_runtime_id__: string;
	var __webpack_hash__: string;
	var __webpack_modules__: object;
	var __webpack_require__: (id: string|number) => any;
	var __webpack_chunk_load__: (id: string|number) => Promise<any>;
	var __non_webpack_require__: (id: string) => any;
	var __webpack_is_included__: (module: string) => boolean;
	var __webpack_exports_info__: ExportsInfo;
	var __webpack_share_scopes__: any;
	var __webpack_init_sharing__: (scope: string) => Promise<void>;

	namespace NodeJS {
		interface Module {
			hot: import("./hot").Hot
		}

		interface Require {
			ensure(
				dependencies: string[],
				callback: (require: (module: string) => void) => void,
				errorCallback?: (error: Error) => void,
				chunkName?: string
			): void;
			context(
				ctx: string,
				includeSubdirs?: boolean,
				filter?: RegExp,
				mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once'
			): Context;
			include(dependency: string): void;
			resolveWeak(dependency: string): void;
		}
	}
}
