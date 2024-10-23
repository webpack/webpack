/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

import { Buffer } from "buffer";
import { AsyncSeriesBailHook, AsyncSeriesHook, SyncHook } from "tapable";
import { URL as URL_Import } from "url";

declare interface Abortable {
	/**
	 * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
	 */
	signal?: AbortSignal;
}
type Alias = string | false | string[];
declare interface AliasOption {
	alias: Alias;
	name: string;
	onlyModule?: boolean;
}
type AliasOptionNewRequest = string | false | string[];
declare interface AliasOptions {
	[index: string]: AliasOptionNewRequest;
}
type BaseFileSystem = FileSystem & SyncFileSystem;
declare interface BaseResolveRequest {
	path: string | false;
	context?: object;
	descriptionFilePath?: string;
	descriptionFileRoot?: string;
	descriptionFileData?: JsonObject;
	relativePath?: string;
	ignoreSymlinks?: boolean;
	fullySpecified?: boolean;
	__innerRequest?: string;
	__innerRequest_request?: string;
	__innerRequest_relativePath?: string;
}
type BufferEncoding =
	| "ascii"
	| "utf8"
	| "utf-8"
	| "utf16le"
	| "utf-16le"
	| "ucs2"
	| "ucs-2"
	| "base64"
	| "base64url"
	| "latin1"
	| "binary"
	| "hex";
type BufferEncodingOption = "buffer" | { encoding: "buffer" };
declare class CachedInputFileSystem {
	constructor(fileSystem: BaseFileSystem, duration: number);
	fileSystem: BaseFileSystem;
	lstat?: LStat;
	lstatSync?: LStatSync;
	stat: Stat;
	statSync: StatSync;
	readdir: Readdir;
	readdirSync: ReaddirSync;
	readFile: ReadFile;
	readFileSync: ReadFileSync;
	readJson?: (
		arg0: PathOrFileDescriptor,
		arg1: (
			arg0: null | Error | NodeJS.ErrnoException,
			arg1?: JsonObject
		) => void
	) => void;
	readJsonSync?: (arg0: PathOrFileDescriptor) => JsonObject;
	readlink: Readlink;
	readlinkSync: ReadlinkSync;
	realpath?: RealPath;
	realpathSync?: RealPathSync;
	purge(
		what?:
			| string
			| number
			| Buffer
			| URL_url
			| (string | number | Buffer | URL_url)[]
			| Set<string | number | Buffer | URL_url>
	): void;
}
declare class CloneBasenamePlugin {
	constructor(
		source:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >,
		target:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	);
	source:
		| string
		| AsyncSeriesBailHook<
				[ResolveRequest, ResolveContext],
				null | ResolveRequest
		  >;
	target:
		| string
		| AsyncSeriesBailHook<
				[ResolveRequest, ResolveContext],
				null | ResolveRequest
		  >;
	apply(resolver: Resolver): void;
}
declare interface Dirent {
	isFile: () => boolean;
	isDirectory: () => boolean;
	isBlockDevice: () => boolean;
	isCharacterDevice: () => boolean;
	isSymbolicLink: () => boolean;
	isFIFO: () => boolean;
	isSocket: () => boolean;
	name: string;
	path: string;
}
type EncodingOption =
	| undefined
	| null
	| "ascii"
	| "utf8"
	| "utf-8"
	| "utf16le"
	| "utf-16le"
	| "ucs2"
	| "ucs-2"
	| "base64"
	| "base64url"
	| "latin1"
	| "binary"
	| "hex"
	| ObjectEncodingOptions;
type ErrorWithDetail = Error & { details?: string };
declare interface ExtensionAliasOption {
	alias: string | string[];
	extension: string;
}
declare interface ExtensionAliasOptions {
	[index: string]: string | string[];
}
declare interface FileSystem {
	readFile: ReadFile;
	readdir: Readdir;
	readJson?: (
		arg0: PathOrFileDescriptor,
		arg1: (
			arg0: null | Error | NodeJS.ErrnoException,
			arg1?: JsonObject
		) => void
	) => void;
	readlink: Readlink;
	lstat?: LStat;
	stat: Stat;
	realpath?: RealPath;
}
type IBigIntStats = IStatsBase<bigint> & {
	atimeNs: bigint;
	mtimeNs: bigint;
	ctimeNs: bigint;
	birthtimeNs: bigint;
};
declare interface IStats {
	isFile: () => boolean;
	isDirectory: () => boolean;
	isBlockDevice: () => boolean;
	isCharacterDevice: () => boolean;
	isSymbolicLink: () => boolean;
	isFIFO: () => boolean;
	isSocket: () => boolean;
	dev: number;
	ino: number;
	mode: number;
	nlink: number;
	uid: number;
	gid: number;
	rdev: number;
	size: number;
	blksize: number;
	blocks: number;
	atimeMs: number;
	mtimeMs: number;
	ctimeMs: number;
	birthtimeMs: number;
	atime: Date;
	mtime: Date;
	ctime: Date;
	birthtime: Date;
}
declare interface IStatsBase<T> {
	isFile: () => boolean;
	isDirectory: () => boolean;
	isBlockDevice: () => boolean;
	isCharacterDevice: () => boolean;
	isSymbolicLink: () => boolean;
	isFIFO: () => boolean;
	isSocket: () => boolean;
	dev: T;
	ino: T;
	mode: T;
	nlink: T;
	uid: T;
	gid: T;
	rdev: T;
	size: T;
	blksize: T;
	blocks: T;
	atimeMs: T;
	mtimeMs: T;
	ctimeMs: T;
	birthtimeMs: T;
	atime: Date;
	mtime: Date;
	ctime: Date;
	birthtime: Date;
}
declare interface Iterator<T, Z> {
	(
		item: T,
		callback: (err?: null | Error, result?: null | Z) => void,
		i: number
	): void;
}
type JsonObject = { [index: string]: JsonValue } & {
	[index: string]:
		| undefined
		| null
		| string
		| number
		| boolean
		| JsonObject
		| JsonValue[];
};
type JsonValue = null | string | number | boolean | JsonObject | JsonValue[];
declare interface KnownHooks {
	resolveStep: SyncHook<
		[
			AsyncSeriesBailHook<
				[ResolveRequest, ResolveContext],
				null | ResolveRequest
			>,
			ResolveRequest
		]
	>;
	noResolve: SyncHook<[ResolveRequest, Error]>;
	resolve: AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	result: AsyncSeriesHook<[ResolveRequest, ResolveContext]>;
}
declare interface LStat {
	(
		path: PathLike,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: IStats) => void
	): void;
	(
		path: PathLike,
		options: undefined | (StatOptions & { bigint?: false }),
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: IStats) => void
	): void;
	(
		path: PathLike,
		options: StatOptions & { bigint: true },
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: IBigIntStats) => void
	): void;
	(
		path: PathLike,
		options: undefined | StatOptions,
		callback: (
			arg0: null | NodeJS.ErrnoException,
			arg1?: IStats | IBigIntStats
		) => void
	): void;
}
declare interface LStatSync {
	(path: PathLike, options?: undefined): IStats;
	(
		path: PathLike,
		options?: StatSyncOptions & { bigint?: false; throwIfNoEntry: false }
	): undefined | IStats;
	(
		path: PathLike,
		options: StatSyncOptions & { bigint: true; throwIfNoEntry: false }
	): undefined | IBigIntStats;
	(path: PathLike, options?: StatSyncOptions & { bigint?: false }): IStats;
	(path: PathLike, options: StatSyncOptions & { bigint: true }): IBigIntStats;
	(
		path: PathLike,
		options: StatSyncOptions & { bigint: boolean; throwIfNoEntry?: false }
	): IStats | IBigIntStats;
	(path: PathLike, options?: StatSyncOptions):
		| undefined
		| IStats
		| IBigIntStats;
}
declare class LogInfoPlugin {
	constructor(
		source:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	);
	source:
		| string
		| AsyncSeriesBailHook<
				[ResolveRequest, ResolveContext],
				null | ResolveRequest
		  >;
	apply(resolver: Resolver): void;
}
declare interface ObjectEncodingOptions {
	encoding?:
		| null
		| "ascii"
		| "utf8"
		| "utf-8"
		| "utf16le"
		| "utf-16le"
		| "ucs2"
		| "ucs-2"
		| "base64"
		| "base64url"
		| "latin1"
		| "binary"
		| "hex";
}
declare interface ParsedIdentifier {
	request: string;
	query: string;
	fragment: string;
	directory: boolean;
	module: boolean;
	file: boolean;
	internal: boolean;
}
type PathLike = string | Buffer | URL_url;
type PathOrFileDescriptor = string | number | Buffer | URL_url;
type Plugin =
	| undefined
	| null
	| false
	| ""
	| 0
	| { apply: (arg0: Resolver) => void }
	| ((this: Resolver, arg1: Resolver) => void);
declare interface PnpApi {
	resolveToUnqualified: (
		arg0: string,
		arg1: string,
		arg2: object
	) => null | string;
}
declare interface ReadFile {
	(
		path: PathOrFileDescriptor,
		options:
			| undefined
			| null
			| ({ encoding?: null; flag?: string } & Abortable),
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: Buffer) => void
	): void;
	(
		path: PathOrFileDescriptor,
		options:
			| ({ encoding: BufferEncoding; flag?: string } & Abortable)
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex",
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string) => void
	): void;
	(
		path: PathOrFileDescriptor,
		options:
			| undefined
			| null
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| (ObjectEncodingOptions & { flag?: string } & Abortable),
		callback: (
			arg0: null | NodeJS.ErrnoException,
			arg1?: string | Buffer
		) => void
	): void;
	(
		path: PathOrFileDescriptor,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: Buffer) => void
	): void;
}
declare interface ReadFileSync {
	(
		path: PathOrFileDescriptor,
		options?: null | { encoding?: null; flag?: string }
	): Buffer;
	(
		path: PathOrFileDescriptor,
		options:
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| { encoding: BufferEncoding; flag?: string }
	): string;
	(
		path: PathOrFileDescriptor,
		options?:
			| null
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| (ObjectEncodingOptions & { flag?: string })
	): string | Buffer;
}
declare interface Readdir {
	(
		path: PathLike,
		options:
			| undefined
			| null
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| {
					encoding:
						| null
						| "ascii"
						| "utf8"
						| "utf-8"
						| "utf16le"
						| "utf-16le"
						| "ucs2"
						| "ucs-2"
						| "base64"
						| "base64url"
						| "latin1"
						| "binary"
						| "hex";
					withFileTypes?: false;
					recursive?: boolean;
			  },
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string[]) => void
	): void;
	(
		path: PathLike,
		options:
			| { encoding: "buffer"; withFileTypes?: false; recursive?: boolean }
			| "buffer",
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: Buffer[]) => void
	): void;
	(
		path: PathLike,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string[]) => void
	): void;
	(
		path: PathLike,
		options:
			| undefined
			| null
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| (ObjectEncodingOptions & {
					withFileTypes?: false;
					recursive?: boolean;
			  }),
		callback: (
			arg0: null | NodeJS.ErrnoException,
			arg1?: string[] | Buffer[]
		) => void
	): void;
	(
		path: PathLike,
		options: ObjectEncodingOptions & {
			withFileTypes: true;
			recursive?: boolean;
		},
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: Dirent[]) => void
	): void;
}
declare interface ReaddirSync {
	(
		path: PathLike,
		options?:
			| null
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| {
					encoding:
						| null
						| "ascii"
						| "utf8"
						| "utf-8"
						| "utf16le"
						| "utf-16le"
						| "ucs2"
						| "ucs-2"
						| "base64"
						| "base64url"
						| "latin1"
						| "binary"
						| "hex";
					withFileTypes?: false;
					recursive?: boolean;
			  }
	): string[];
	(
		path: PathLike,
		options:
			| "buffer"
			| { encoding: "buffer"; withFileTypes?: false; recursive?: boolean }
	): Buffer[];
	(
		path: PathLike,
		options?:
			| null
			| "ascii"
			| "utf8"
			| "utf-8"
			| "utf16le"
			| "utf-16le"
			| "ucs2"
			| "ucs-2"
			| "base64"
			| "base64url"
			| "latin1"
			| "binary"
			| "hex"
			| (ObjectEncodingOptions & { withFileTypes?: false; recursive?: boolean })
	): string[] | Buffer[];
	(
		path: PathLike,
		options: ObjectEncodingOptions & {
			withFileTypes: true;
			recursive?: boolean;
		}
	): Dirent[];
}
declare interface Readlink {
	(
		path: PathLike,
		options: EncodingOption,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string) => void
	): void;
	(
		path: PathLike,
		options: BufferEncodingOption,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: Buffer) => void
	): void;
	(
		path: PathLike,
		options: EncodingOption,
		callback: (
			arg0: null | NodeJS.ErrnoException,
			arg1?: string | Buffer
		) => void
	): void;
	(
		path: PathLike,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string) => void
	): void;
}
declare interface ReadlinkSync {
	(path: PathLike, options?: EncodingOption): string;
	(path: PathLike, options: BufferEncodingOption): Buffer;
	(path: PathLike, options?: EncodingOption): string | Buffer;
}
declare interface RealPath {
	(
		path: PathLike,
		options: EncodingOption,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string) => void
	): void;
	(
		path: PathLike,
		options: BufferEncodingOption,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: Buffer) => void
	): void;
	(
		path: PathLike,
		options: EncodingOption,
		callback: (
			arg0: null | NodeJS.ErrnoException,
			arg1?: string | Buffer
		) => void
	): void;
	(
		path: PathLike,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: string) => void
	): void;
}
declare interface RealPathSync {
	(path: PathLike, options?: EncodingOption): string;
	(path: PathLike, options: BufferEncodingOption): Buffer;
	(path: PathLike, options?: EncodingOption): string | Buffer;
}
declare interface ResolveContext {
	contextDependencies?: WriteOnlySet<string>;

	/**
	 * files that was found on file system
	 */
	fileDependencies?: WriteOnlySet<string>;

	/**
	 * dependencies that was not found on file system
	 */
	missingDependencies?: WriteOnlySet<string>;

	/**
	 * set of hooks' calls. For instance, `resolve → parsedResolve → describedResolve`,
	 */
	stack?: Set<string>;

	/**
	 * log function
	 */
	log?: (arg0: string) => void;

	/**
	 * yield result, if provided plugins can return several results
	 */
	yield?: (arg0: ResolveRequest) => void;
}
declare interface ResolveFunction {
	(context: object, path: string, request: string): string | false;
	(path: string, request: string): string | false;
}
declare interface ResolveFunctionAsync {
	(
		context: object,
		path: string,
		request: string,
		resolveContext: ResolveContext,
		callback: (
			err: null | ErrorWithDetail,
			res?: string | false,
			req?: ResolveRequest
		) => void
	): void;
	(
		context: object,
		path: string,
		request: string,
		callback: (
			err: null | ErrorWithDetail,
			res?: string | false,
			req?: ResolveRequest
		) => void
	): void;
	(
		path: string,
		request: string,
		resolveContext: ResolveContext,
		callback: (
			err: null | ErrorWithDetail,
			res?: string | false,
			req?: ResolveRequest
		) => void
	): void;
	(
		path: string,
		request: string,
		callback: (
			err: null | ErrorWithDetail,
			res?: string | false,
			req?: ResolveRequest
		) => void
	): void;
}
type ResolveOptionsOptionalFS = Omit<
	ResolveOptionsResolverFactoryObject_2,
	"fileSystem"
> &
	Partial<Pick<ResolveOptionsResolverFactoryObject_2, "fileSystem">>;
declare interface ResolveOptionsResolverFactoryObject_1 {
	alias: AliasOption[];
	fallback: AliasOption[];
	aliasFields: Set<string | string[]>;
	extensionAlias: ExtensionAliasOption[];
	cachePredicate: (arg0: ResolveRequest) => boolean;
	cacheWithContext: boolean;

	/**
	 * A list of exports field condition names.
	 */
	conditionNames: Set<string>;
	descriptionFiles: string[];
	enforceExtension: boolean;
	exportsFields: Set<string | string[]>;
	importsFields: Set<string | string[]>;
	extensions: Set<string>;
	fileSystem: FileSystem;
	unsafeCache: false | object;
	symlinks: boolean;
	resolver?: Resolver;
	modules: (string | string[])[];
	mainFields: { name: string[]; forceRelative: boolean }[];
	mainFiles: Set<string>;
	plugins: Plugin[];
	pnpApi: null | PnpApi;
	roots: Set<string>;
	fullySpecified: boolean;
	resolveToContext: boolean;
	restrictions: Set<string | RegExp>;
	preferRelative: boolean;
	preferAbsolute: boolean;
}
declare interface ResolveOptionsResolverFactoryObject_2 {
	/**
	 * A list of module alias configurations or an object which maps key to value
	 */
	alias?: AliasOptions | AliasOption[];

	/**
	 * A list of module alias configurations or an object which maps key to value, applied only after modules option
	 */
	fallback?: AliasOptions | AliasOption[];

	/**
	 * An object which maps extension to extension aliases
	 */
	extensionAlias?: ExtensionAliasOptions;

	/**
	 * A list of alias fields in description files
	 */
	aliasFields?: (string | string[])[];

	/**
	 * A function which decides whether a request should be cached or not. An object is passed with at least `path` and `request` properties.
	 */
	cachePredicate?: (arg0: ResolveRequest) => boolean;

	/**
	 * Whether or not the unsafeCache should include request context as part of the cache key.
	 */
	cacheWithContext?: boolean;

	/**
	 * A list of description files to read from
	 */
	descriptionFiles?: string[];

	/**
	 * A list of exports field condition names.
	 */
	conditionNames?: string[];

	/**
	 * Enforce that a extension from extensions must be used
	 */
	enforceExtension?: boolean;

	/**
	 * A list of exports fields in description files
	 */
	exportsFields?: (string | string[])[];

	/**
	 * A list of imports fields in description files
	 */
	importsFields?: (string | string[])[];

	/**
	 * A list of extensions which should be tried for files
	 */
	extensions?: string[];

	/**
	 * The file system which should be used
	 */
	fileSystem: FileSystem;

	/**
	 * Use this cache object to unsafely cache the successful requests
	 */
	unsafeCache?: boolean | object;

	/**
	 * Resolve symlinks to their symlinked location
	 */
	symlinks?: boolean;

	/**
	 * A prepared Resolver to which the plugins are attached
	 */
	resolver?: Resolver;

	/**
	 * A list of directories to resolve modules from, can be absolute path or folder name
	 */
	modules?: string | string[];

	/**
	 * A list of main fields in description files
	 */
	mainFields?: (
		| string
		| string[]
		| { name: string | string[]; forceRelative: boolean }
	)[];

	/**
	 * A list of main files in directories
	 */
	mainFiles?: string[];

	/**
	 * A list of additional resolve plugins which should be applied
	 */
	plugins?: Plugin[];

	/**
	 * A PnP API that should be used - null is "never", undefined is "auto"
	 */
	pnpApi?: null | PnpApi;

	/**
	 * A list of root paths
	 */
	roots?: string[];

	/**
	 * The request is already fully specified and no extensions or directories are resolved for it
	 */
	fullySpecified?: boolean;

	/**
	 * Resolve to a context instead of a file
	 */
	resolveToContext?: boolean;

	/**
	 * A list of resolve restrictions
	 */
	restrictions?: (string | RegExp)[];

	/**
	 * Use only the sync constraints of the file system calls
	 */
	useSyncFileSystemCalls?: boolean;

	/**
	 * Prefer to resolve module requests as relative requests before falling back to modules
	 */
	preferRelative?: boolean;

	/**
	 * Prefer to resolve server-relative urls as absolute paths before falling back to resolve in roots
	 */
	preferAbsolute?: boolean;
}
type ResolveRequest = BaseResolveRequest & Partial<ParsedIdentifier>;
declare abstract class Resolver {
	fileSystem: FileSystem;
	options: ResolveOptionsResolverFactoryObject_1;
	hooks: KnownHooks;
	ensureHook(
		name:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	): AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	getHook(
		name:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	): AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	resolveSync(context: object, path: string, request: string): string | false;
	resolve(
		context: object,
		path: string,
		request: string,
		resolveContext: ResolveContext,
		callback: (
			err: null | ErrorWithDetail,
			res?: string | false,
			req?: ResolveRequest
		) => void
	): void;
	doResolve(
		hook: AsyncSeriesBailHook<
			[ResolveRequest, ResolveContext],
			null | ResolveRequest
		>,
		request: ResolveRequest,
		message: null | string,
		resolveContext: ResolveContext,
		callback: (err?: null | Error, result?: ResolveRequest) => void
	): void;
	parse(identifier: string): ParsedIdentifier;
	isModule(path: string): boolean;
	isPrivate(path: string): boolean;
	isDirectory(path: string): boolean;
	join(path: string, request: string): string;
	normalize(path: string): string;
}
declare interface Stat {
	(
		path: PathLike,
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: IStats) => void
	): void;
	(
		path: PathLike,
		options: undefined | (StatOptions & { bigint?: false }),
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: IStats) => void
	): void;
	(
		path: PathLike,
		options: StatOptions & { bigint: true },
		callback: (arg0: null | NodeJS.ErrnoException, arg1?: IBigIntStats) => void
	): void;
	(
		path: PathLike,
		options: undefined | StatOptions,
		callback: (
			arg0: null | NodeJS.ErrnoException,
			arg1?: IStats | IBigIntStats
		) => void
	): void;
}
declare interface StatOptions {
	bigint?: boolean;
}
declare interface StatSync {
	(path: PathLike, options?: undefined): IStats;
	(
		path: PathLike,
		options?: StatSyncOptions & { bigint?: false; throwIfNoEntry: false }
	): undefined | IStats;
	(
		path: PathLike,
		options: StatSyncOptions & { bigint: true; throwIfNoEntry: false }
	): undefined | IBigIntStats;
	(path: PathLike, options?: StatSyncOptions & { bigint?: false }): IStats;
	(path: PathLike, options: StatSyncOptions & { bigint: true }): IBigIntStats;
	(
		path: PathLike,
		options: StatSyncOptions & { bigint: boolean; throwIfNoEntry?: false }
	): IStats | IBigIntStats;
	(path: PathLike, options?: StatSyncOptions):
		| undefined
		| IStats
		| IBigIntStats;
}
declare interface StatSyncOptions {
	bigint?: boolean;
	throwIfNoEntry?: boolean;
}
declare interface SyncFileSystem {
	readFileSync: ReadFileSync;
	readdirSync: ReaddirSync;
	readJsonSync?: (arg0: PathOrFileDescriptor) => JsonObject;
	readlinkSync: ReadlinkSync;
	lstatSync?: LStatSync;
	statSync: StatSync;
	realpathSync?: RealPathSync;
}

/**
 * `URL` class is a global reference for `require('url').URL`
 * https://nodejs.org/api/url.html#the-whatwg-url-api
 */
declare interface URL_url extends URL_Import {}
declare interface WriteOnlySet<T> {
	add: (item: T) => void;
}
declare function exports(
	context: object,
	path: string,
	request: string,
	resolveContext: ResolveContext,
	callback: (
		err: null | ErrorWithDetail,
		res?: string | false,
		req?: ResolveRequest
	) => void
): void;
declare function exports(
	context: object,
	path: string,
	request: string,
	callback: (
		err: null | ErrorWithDetail,
		res?: string | false,
		req?: ResolveRequest
	) => void
): void;
declare function exports(
	path: string,
	request: string,
	resolveContext: ResolveContext,
	callback: (
		err: null | ErrorWithDetail,
		res?: string | false,
		req?: ResolveRequest
	) => void
): void;
declare function exports(
	path: string,
	request: string,
	callback: (
		err: null | ErrorWithDetail,
		res?: string | false,
		req?: ResolveRequest
	) => void
): void;
declare namespace exports {
	export const sync: ResolveFunction;
	export function create(
		options: ResolveOptionsOptionalFS
	): ResolveFunctionAsync;
	export namespace create {
		export const sync: (options: ResolveOptionsOptionalFS) => ResolveFunction;
	}
	export namespace ResolverFactory {
		export let createResolver: (
			options: ResolveOptionsResolverFactoryObject_2
		) => Resolver;
	}
	export const forEachBail: <T, Z>(
		array: T[],
		iterator: Iterator<T, Z>,
		callback: (err?: null | Error, result?: null | Z, i?: number) => void
	) => void;
	export type ResolveCallback = (
		err: null | ErrorWithDetail,
		res?: string | false,
		req?: ResolveRequest
	) => void;
	export {
		CachedInputFileSystem,
		CloneBasenamePlugin,
		LogInfoPlugin,
		ResolveOptionsOptionalFS,
		PnpApi,
		Resolver,
		FileSystem,
		ResolveContext,
		ResolveRequest,
		Plugin,
		ResolveOptionsResolverFactoryObject_2 as ResolveOptions,
		ResolveFunctionAsync,
		ResolveFunction
	};
}

export = exports;
