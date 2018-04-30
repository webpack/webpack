declare module "*.json";
declare module "webpack-cli";

// Deprecated NodeJS API usages in Webpack
declare namespace NodeJS {
	interface Process {
		binding(internalModule: string): any;
	}
}

// There are no typings for chrome-trace-event
declare module "chrome-trace-event" {
	interface Event {
		name: string;
		id?: number;
		cat: string[];
		args?: Object;
	}

	export class Tracer {
		constructor(options: { noStream: boolean });
		pipe(stream: NodeJS.WritableStream): void;
		instantEvent(event: Event): void;
		counter: number;
		trace: {
			begin(event: Event): void;
			end(event: Event): void;
		};
	}
}

/**
 * Global variable declarations
 * @todo Once this issue is resolved, remove these globals and add JSDoc onsite instead
 * https://github.com/Microsoft/TypeScript/issues/15626
 */
declare const $hash$;
declare const $requestTimeout$;
declare const installedModules;
declare const $require$;
declare const hotDownloadManifest;
declare const hotDownloadUpdateChunk;
declare const hotDisposeChunk;
declare const modules;
declare const installedChunks;
declare const hotAddUpdateChunk;
declare const parentHotUpdateCallback;
declare const $hotChunkFilename$;
declare const $hotMainFilename$;
declare const WebAssembly;
declare const importScripts;
declare const $crossOriginLoading$;
declare const chunkId;
