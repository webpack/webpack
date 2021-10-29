export {};

interface ExportInfo {
	used: boolean;
	provideInfo: boolean | null | undefined;
	useInfo: boolean | null | undefined;
}

interface ExportsInfo {
	[k: string]: ExportInfo & {[k: string]: ExportInfo}
}

declare global {
	interface ImportMeta {
		url: string;
		webpack: number;
		webpackHot: import("./hot").Hot;
	}

	var __resourceQuery: string;
	var __webpack_public_path__: string;
	var __webpack_base_uri__: string;
	var __webpack_runtime_id__: string;
	var __webpack_hash__: string;
	var __webpack_modules__: object;
	var __webpack_require__: (id: string|number) => any;
	var __webpack_chunk_load__: (id: string|number) => Promise<any>;
	var __non_webpack_require__: (id: string) => any;
	var __webpack_is_included__: (module: string) => boolean;
	var __webpack_exports_info__: ExportsInfo;

	namespace NodeJS {
		interface Module {
			hot: import("./hot").Hot
		}
	}
}
