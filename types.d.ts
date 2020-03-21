/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

import {
	ArrayExpression,
	ArrowFunctionExpression,
	AssignmentExpression,
	AwaitExpression,
	BinaryExpression,
	BlockStatement,
	BreakStatement,
	ClassDeclaration,
	ClassExpression,
	Comment,
	ConditionalExpression,
	ContinueStatement,
	DebuggerStatement,
	DoWhileStatement,
	EmptyStatement,
	ExportAllDeclaration,
	ExportDefaultDeclaration,
	ExportNamedDeclaration,
	ExpressionStatement,
	ForInStatement,
	ForOfStatement,
	ForStatement,
	FunctionDeclaration,
	FunctionExpression,
	Identifier,
	IfStatement,
	ImportDeclaration,
	LabeledStatement,
	LogicalExpression,
	MemberExpression,
	MetaProperty,
	MethodDefinition,
	NewExpression,
	ObjectExpression,
	Program,
	RegExpLiteral,
	ReturnStatement,
	SequenceExpression,
	SimpleCallExpression,
	SimpleLiteral,
	Super,
	SwitchStatement,
	TaggedTemplateExpression,
	TemplateLiteral,
	ThisExpression,
	ThrowStatement,
	TryStatement,
	UnaryExpression,
	UpdateExpression,
	VariableDeclaration,
	VariableDeclarator,
	WhileStatement,
	WithStatement,
	YieldExpression
} from "estree";
import { Stats as FsStats, WriteStream } from "fs";
import { default as ValidationError } from "schema-utils/declarations/ValidationError";
import {
	AsArray,
	AsyncParallelHook,
	AsyncSeriesBailHook,
	AsyncSeriesHook,
	AsyncSeriesWaterfallHook,
	HookMap,
	MultiHook,
	SyncBailHook,
	SyncHook,
	SyncWaterfallHook
} from "tapable";

declare namespace internals {
	export class AbstractLibraryPlugin<T> {
		constructor(__0: {
			/**
			 * name of the plugin
			 */
			pluginName: string;
			/**
			 * used library type
			 */
			type:
				| "var"
				| "module"
				| "assign"
				| "this"
				| "window"
				| "self"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system";
		});

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		parseOptions(library: internals.LibraryOptions): false | T;
		finishEntryModule(
			module: internals.Module,
			libraryContext: internals.LibraryContext<T>
		): void;
		runtimeRequirements(
			chunk: internals.Chunk,
			set: Set<string>,
			libraryContext: internals.LibraryContext<T>
		): void;
		render(
			source: internals.Source,
			renderContext: internals.RenderContextJavascriptModulesPlugin,
			libraryContext: internals.LibraryContext<T>
		): internals.Source;
		chunkHash(
			chunk: internals.Chunk,
			hash: internals.Hash,
			chunkHashContext: internals.ChunkHashContext,
			libraryContext: internals.LibraryContext<T>
		): void;
	}
	export class AggressiveMergingPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class AggressiveSplittingPlugin {
		constructor(options?: internals.AggressiveSplittingPluginOptions);
		options: internals.AggressiveSplittingPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static wasChunkRecorded(chunk: internals.Chunk): boolean;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface AggressiveSplittingPluginOptions {
		/**
		 * Extra cost for each chunk (Default: 9.8kiB).
		 */
		chunkOverhead?: number;

		/**
		 * Extra cost multiplicator for entry chunks (Default: 10).
		 */
		entryChunkMultiplicator?: number;

		/**
		 * Byte, max size of per file (Default: 50kiB).
		 */
		maxSize?: number;

		/**
		 * Byte, split point. (Default: 30kiB).
		 */
		minSize?: number;
	}
	export type Amd = false | { [index: string]: any };
	export interface Argument {
		description: string;
		simpleType: "string" | "number" | "boolean";
		multiple: boolean;
		configs: Array<internals.ArgumentConfig>;
	}
	export interface ArgumentConfig {
		description: string;
		path: string;
		multiple: boolean;
		type:
			| "string"
			| "number"
			| "boolean"
			| "path"
			| "enum"
			| "RegExp"
			| "reset";
		values?: Array<any>;
	}
	export interface Asset {
		/**
		 * the filename of the asset
		 */
		name: string;

		/**
		 * source of the asset
		 */
		source: internals.Source;

		/**
		 * info about the asset
		 */
		info: internals.AssetInfo;
	}
	export interface AssetEmittedInfo {
		content: Buffer;
		source: internals.Source;
		compilation: internals.Compilation;
		outputPath: string;
		targetPath: string;
	}
	export interface AssetInfo {
		/**
		 * true, if the asset can be long term cached forever (contains a hash)
		 */
		immutable?: boolean;

		/**
		 * size in bytes, only set after asset has been emitted
		 */
		size?: number;

		/**
		 * true, when asset is only used for development and doesn't count towards user-facing assets
		 */
		development?: boolean;

		/**
		 * true, when asset ships data for updating an existing application (HMR)
		 */
		hotModuleReplacement?: boolean;
	}
	export type AssetModuleFilename =
		| string
		| ((
				pathData: internals.PathData,
				assetInfo: internals.AssetInfo
		  ) => string);
	export abstract class AsyncDependenciesBlock extends internals.DependenciesBlock {
		groupOptions: {
			preloadOrder?: number;
			prefetchOrder?: number;
			name: string;
		};
		loc:
			| internals.SyntheticDependencyLocation
			| internals.RealDependencyLocation;
		request: string;
		parent: internals.DependenciesBlock;
		chunkName: string;
		module: any;
	}
	export abstract class AsyncQueue<T, K, R> {
		hooks: {
			beforeAdd: AsyncSeriesHook<[T]>;
			added: SyncHook<[T], void>;
			beforeStart: AsyncSeriesHook<[T]>;
			started: SyncHook<[T], void>;
			result: SyncHook<[T, Error, R], void>;
		};
		add(item: T, callback: internals.CallbackCompiler<R>): void;
		invalidate(item: T): void;
		stop(): void;
		increaseParallelism(): void;
		decreaseParallelism(): void;
		isProcessing(item: T): boolean;
		isQueued(item: T): boolean;
		isDone(item: T): boolean;
	}
	export class AsyncWebAssemblyModulesPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		renderModule(module?: any, renderContext?: any, hooks?: any): any;
		static getCompilationHooks(
			compilation: internals.Compilation
		): internals.CompilationHooksAsyncWebAssemblyModulesPlugin;
	}
	export class AutomaticPrefetchPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type AuxiliaryComment =
		| string
		| internals.LibraryCustomUmdCommentObject;
	export class BannerPlugin {
		constructor(
			options:
				| string
				| internals.BannerPluginOptions
				| ((data: {
						hash: string;
						chunk: internals.Chunk;
						filename: string;
				  }) => string)
		);
		options: internals.BannerPluginOptions;
		banner: (data: {
			hash: string;
			chunk: internals.Chunk;
			filename: string;
		}) => string;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type BannerPluginArgument =
		| string
		| internals.BannerPluginOptions
		| ((data: {
				hash: string;
				chunk: internals.Chunk;
				filename: string;
		  }) => string);
	export interface BannerPluginOptions {
		/**
		 * Specifies the banner.
		 */
		banner:
			| string
			| ((data: {
					hash: string;
					chunk: internals.Chunk;
					filename: string;
			  }) => string);

		/**
		 * If true, the banner will only be added to the entry chunks.
		 */
		entryOnly?: boolean;

		/**
		 * Exclude all modules matching any of these conditions.
		 */
		exclude?: string | RegExp | Array<string | RegExp>;

		/**
		 * Include all modules matching any of these conditions.
		 */
		include?: string | RegExp | Array<string | RegExp>;

		/**
		 * If true, banner will not be wrapped in a comment.
		 */
		raw?: boolean;

		/**
		 * Include all modules that pass test assertion.
		 */
		test?: string | RegExp | Array<string | RegExp>;
	}
	export abstract class BasicEvaluatedExpression {
		type: number;
		range: any;
		falsy: boolean;
		truthy: boolean;
		bool: any;
		number: any;
		bigint: any;
		regExp: any;
		string: any;
		quasis: any;
		parts: any;
		array: any;
		items: any;
		options: any;
		prefix: any;
		postfix: any;
		wrappedInnerExpressions: any;
		identifier: any;
		rootInfo: any;
		getMembers: any;
		expression: any;
		isNull(): boolean;
		isString(): boolean;
		isNumber(): boolean;
		isBigInt(): boolean;
		isBoolean(): boolean;
		isRegExp(): boolean;
		isConditional(): boolean;
		isArray(): boolean;
		isConstArray(): boolean;
		isIdentifier(): boolean;
		isWrapped(): boolean;
		isTemplateString(): boolean;
		isTruthy(): boolean;
		isFalsy(): boolean;
		asBool(): any;
		asString(): any;
		setString(string?: any): internals.BasicEvaluatedExpression;
		setNull(): internals.BasicEvaluatedExpression;
		setNumber(number?: any): internals.BasicEvaluatedExpression;
		setBigInt(bigint?: any): internals.BasicEvaluatedExpression;
		setBoolean(bool?: any): internals.BasicEvaluatedExpression;
		setRegExp(regExp?: any): internals.BasicEvaluatedExpression;
		setIdentifier(
			identifier?: any,
			rootInfo?: any,
			getMembers?: any
		): internals.BasicEvaluatedExpression;
		setWrapped(
			prefix?: any,
			postfix?: any,
			innerExpressions?: any
		): internals.BasicEvaluatedExpression;
		setOptions(options?: any): internals.BasicEvaluatedExpression;
		addOptions(options?: any): internals.BasicEvaluatedExpression;
		setItems(items?: any): internals.BasicEvaluatedExpression;
		setArray(array?: any): internals.BasicEvaluatedExpression;
		setTemplateString(
			quasis?: any,
			parts?: any,
			kind?: any
		): internals.BasicEvaluatedExpression;
		templateStringKind: any;
		setTruthy(): internals.BasicEvaluatedExpression;
		setFalsy(): internals.BasicEvaluatedExpression;
		setRange(range?: any): internals.BasicEvaluatedExpression;
		setExpression(expression?: any): internals.BasicEvaluatedExpression;
	}
	export abstract class ByTypeGenerator extends internals.Generator {
		map: any;
	}
	export class Cache {
		constructor();
		hooks: {
			get: AsyncSeriesBailHook<
				[
					string,
					internals.Etag,
					Array<(result: any, stats: internals.CallbackCache<void>) => void>
				],
				any
			>;
			store: AsyncParallelHook<[string, internals.Etag, any]>;
			storeBuildDependencies: AsyncParallelHook<[Iterable<string>]>;
			beginIdle: SyncHook<[], void>;
			endIdle: AsyncParallelHook<[]>;
			shutdown: AsyncParallelHook<[]>;
		};
		get<T>(
			identifier: string,
			etag: internals.Etag,
			callback: internals.CallbackCache<T>
		): void;
		store<T>(
			identifier: string,
			etag: internals.Etag,
			data: T,
			callback: internals.CallbackCache<void>
		): void;

		/**
		 * After this method has succeeded the cache can only be restored when build dependencies are
		 */
		storeBuildDependencies(
			dependencies: Iterable<string>,
			callback: internals.CallbackCache<void>
		): void;
		beginIdle(): void;
		endIdle(callback: internals.CallbackCache<void>): void;
		shutdown(callback: internals.CallbackCache<void>): void;
		static STAGE_MEMORY: number;
		static STAGE_DEFAULT: number;
		static STAGE_DISK: number;
		static STAGE_NETWORK: number;
	}
	export interface CacheGroupSource {
		key?: string;
		priority?: number;
		getName?: (
			module?: internals.Module,
			chunks?: Array<internals.Chunk>,
			key?: string
		) => string;
		chunksFilter?: (chunk: internals.Chunk) => boolean;
		enforce?: boolean;
		minSize: Record<string, number>;
		minRemainingSize: Record<string, number>;
		maxAsyncSize: Record<string, number>;
		maxInitialSize: Record<string, number>;
		minChunks?: number;
		maxAsyncRequests?: number;
		maxInitialRequests?: number;
		filename?:
			| string
			| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string);
		idHint?: string;
		automaticNameDelimiter: string;
		reuseExistingChunk?: boolean;
	}
	export interface CacheGroupsContext {
		moduleGraph: internals.ModuleGraph;
		chunkGraph: internals.ChunkGraph;
	}
	export type CacheOptions =
		| boolean
		| internals.MemoryCacheOptions
		| internals.FileCacheOptions;
	export type CacheOptionsNormalized =
		| false
		| internals.MemoryCacheOptions
		| internals.FileCacheOptions;
	export type CallExpression = SimpleCallExpression | NewExpression;
	export interface CallbackCache<T> {
		(err?: internals.WebpackError, stats?: T): void;
	}
	export interface CallbackCompiler<T> {
		(err?: Error, result?: T): any;
	}
	export interface CallbackWebpack<T> {
		(err?: Error, stats?: T): void;
	}
	export abstract class Chunk {
		id: string | number;
		ids: Array<string | number>;
		debugId: number;
		name: string;
		idNameHints: internals.SortableSet<string>;
		preventIntegration: boolean;
		filenameTemplate:
			| string
			| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string);
		files: Set<string>;
		auxiliaryFiles: Set<string>;
		rendered: boolean;
		hash: string;
		contentHash: Record<string, string>;
		renderedHash: string;
		chunkReason: string;
		extraAsync: boolean;
		readonly entryModule: internals.Module;
		hasEntryModule(): boolean;
		addModule(module: internals.Module): boolean;
		removeModule(module: internals.Module): void;
		getNumberOfModules(): number;
		readonly modulesIterable: Iterable<internals.Module>;
		compareTo(otherChunk: internals.Chunk): 0 | 1 | -1;
		containsModule(module: internals.Module): boolean;
		getModules(): Array<internals.Module>;
		remove(): void;
		moveModule(module: internals.Module, otherChunk: internals.Chunk): void;
		integrate(otherChunk: internals.Chunk): boolean;
		canBeIntegrated(otherChunk: internals.Chunk): boolean;
		isEmpty(): boolean;
		modulesSize(): number;
		size(options?: internals.ChunkSizeOptions): number;
		integratedSize(
			otherChunk: internals.Chunk,
			options: internals.ChunkSizeOptions
		): number;
		getChunkModuleMaps(
			filterFn: (m: internals.Module) => boolean
		): internals.ChunkModuleMaps;
		hasModuleInGraph(
			filterFn: (m: internals.Module) => boolean,
			filterChunkFn: (
				c: internals.Chunk,
				chunkGraph: internals.ChunkGraph
			) => boolean
		): boolean;
		getChunkMaps(realHash: boolean): internals.ChunkMaps;
		hasRuntime(): boolean;
		canBeInitial(): boolean;
		isOnlyInitial(): boolean;
		addGroup(chunkGroup: internals.ChunkGroup): void;
		removeGroup(chunkGroup: internals.ChunkGroup): void;
		isInGroup(chunkGroup: internals.ChunkGroup): boolean;
		getNumberOfGroups(): number;
		readonly groupsIterable: Iterable<internals.ChunkGroup>;
		disconnectFromGroups(): void;
		split(newChunk: internals.Chunk): void;

		/**
		 * Update the hash
		 */
		updateHash(hash: internals.Hash, chunkGraph: internals.ChunkGraph): void;
		getAllAsyncChunks(): Set<internals.Chunk>;
		getAllReferencedChunks(): Set<internals.Chunk>;
		hasAsyncChunks(): boolean;
		getChildIdsByOrders(
			chunkGraph: internals.ChunkGraph,
			filterFn: (
				c: internals.Chunk,
				chunkGraph: internals.ChunkGraph
			) => boolean
		): Record<string, Array<string | number>>;
		getChildIdsByOrdersMap(
			chunkGraph: internals.ChunkGraph,
			includeDirectChildren: boolean,
			filterFn: (
				c: internals.Chunk,
				chunkGraph: internals.ChunkGraph
			) => boolean
		): Record<string | number, Record<string, Array<string | number>>>;
	}
	export abstract class ChunkGraph {
		moduleGraph: internals.ModuleGraph;
		connectChunkAndModule(
			chunk: internals.Chunk,
			module: internals.Module
		): void;
		disconnectChunkAndModule(
			chunk: internals.Chunk,
			module: internals.Module
		): void;
		disconnectChunk(chunk: internals.Chunk): void;
		attachModules(
			chunk: internals.Chunk,
			modules: Iterable<internals.Module>
		): void;
		attachRuntimeModules(
			chunk: internals.Chunk,
			modules: Iterable<internals.RuntimeModule>
		): void;
		replaceModule(
			oldModule: internals.Module,
			newModule: internals.Module
		): void;
		isModuleInChunk(module: internals.Module, chunk: internals.Chunk): boolean;
		isModuleInChunkGroup(
			module: internals.Module,
			chunkGroup: internals.ChunkGroup
		): boolean;
		isEntryModule(module: internals.Module): boolean;
		getModuleChunksIterable(
			module: internals.Module
		): Iterable<internals.Chunk>;
		getOrderedModuleChunksIterable(
			module: internals.Module,
			sortFn: (arg0: internals.Chunk, arg1: internals.Chunk) => 0 | 1 | -1
		): Iterable<internals.Chunk>;
		getModuleChunks(module: internals.Module): Array<internals.Chunk>;
		getNumberOfModuleChunks(module: internals.Module): number;
		haveModulesEqualChunks(
			moduleA: internals.Module,
			moduleB: internals.Module
		): boolean;
		getNumberOfChunkModules(chunk: internals.Chunk): number;
		getChunkModulesIterable(chunk: internals.Chunk): Iterable<internals.Module>;
		getChunkModulesIterableBySourceType(
			chunk: internals.Chunk,
			sourceType: string
		): Iterable<internals.Module>;
		getOrderedChunkModulesIterable(
			chunk: internals.Chunk,
			comparator: (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1
		): Iterable<internals.Module>;
		getOrderedChunkModulesIterableBySourceType(
			chunk: internals.Chunk,
			sourceType: string,
			comparator: (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1
		): Iterable<internals.Module>;
		getChunkModules(chunk: internals.Chunk): Array<internals.Module>;
		getOrderedChunkModules(
			chunk: internals.Chunk,
			comparator: (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1
		): Array<internals.Module>;
		getChunkModuleMaps(
			chunk: internals.Chunk,
			filterFn: (m: internals.Module) => boolean,
			includeAllChunks?: boolean
		): internals.ChunkModuleMaps;
		getChunkConditionMap(
			chunk: internals.Chunk,
			filterFn: (
				c: internals.Chunk,
				chunkGraph: internals.ChunkGraph
			) => boolean
		): Record<string | number, boolean>;
		hasModuleInChunk(
			chunk: internals.Chunk,
			filterFn: (m: internals.Module) => boolean
		): boolean;
		hasModuleInGraph(
			chunk: internals.Chunk,
			filterFn: (m: internals.Module) => boolean,
			filterChunkFn: (
				c: internals.Chunk,
				chunkGraph: internals.ChunkGraph
			) => boolean
		): boolean;
		compareChunks(chunkA: internals.Chunk, chunkB: internals.Chunk): 0 | 1 | -1;
		getChunkModulesSize(chunk: internals.Chunk): number;
		getChunkModulesSizes(chunk: internals.Chunk): Record<string, number>;
		getChunkRootModules(chunk: internals.Chunk): Array<internals.Module>;
		getChunkSize(
			chunk: internals.Chunk,
			options?: internals.ChunkSizeOptions
		): number;
		getIntegratedChunksSize(
			chunkA: internals.Chunk,
			chunkB: internals.Chunk,
			options?: internals.ChunkSizeOptions
		): number;
		canChunksBeIntegrated(
			chunkA: internals.Chunk,
			chunkB: internals.Chunk
		): boolean;
		integrateChunks(chunkA: internals.Chunk, chunkB: internals.Chunk): void;
		isEntryModuleInChunk(
			module: internals.Module,
			chunk: internals.Chunk
		): boolean;
		connectChunkAndEntryModule(
			chunk: internals.Chunk,
			module: internals.Module,
			entrypoint: internals.Entrypoint
		): void;
		connectChunkAndRuntimeModule(
			chunk: internals.Chunk,
			module: internals.RuntimeModule
		): void;
		disconnectChunkAndEntryModule(
			chunk: internals.Chunk,
			module: internals.Module
		): void;
		disconnectChunkAndRuntimeModule(
			chunk: internals.Chunk,
			module: internals.RuntimeModule
		): void;
		disconnectEntryModule(module: internals.Module): void;
		disconnectEntries(chunk: internals.Chunk): void;
		getNumberOfEntryModules(chunk: internals.Chunk): number;
		getNumberOfRuntimeModules(chunk: internals.Chunk): number;
		getChunkEntryModulesIterable(
			chunk: internals.Chunk
		): Iterable<internals.Module>;
		getChunkEntryDependentChunksIterable(
			chunk: internals.Chunk
		): Iterable<internals.Chunk>;
		hasChunkEntryDependentChunks(chunk: internals.Chunk): boolean;
		getChunkRuntimeModulesIterable(
			chunk: internals.Chunk
		): Iterable<internals.RuntimeModule>;
		getChunkRuntimeModulesInOrder(
			chunk: internals.Chunk
		): Array<internals.RuntimeModule>;
		getChunkEntryModulesWithChunkGroupIterable(
			chunk: internals.Chunk
		): Iterable<[internals.Module, internals.Entrypoint]>;
		getBlockChunkGroup(
			depBlock: internals.AsyncDependenciesBlock
		): internals.ChunkGroup;
		connectBlockAndChunkGroup(
			depBlock: internals.AsyncDependenciesBlock,
			chunkGroup: internals.ChunkGroup
		): void;
		disconnectChunkGroup(chunkGroup: internals.ChunkGroup): void;
		getModuleId(module: internals.Module): string | number;
		setModuleId(module: internals.Module, id: string | number): void;
		getModuleHash(module: internals.Module): string;
		getRenderedModuleHash(module: internals.Module): string;
		setModuleHashes(
			module: internals.Module,
			hash: string,
			renderedHash: string
		): void;
		addModuleRuntimeRequirements(
			module: internals.Module,
			items: Set<string>
		): void;
		addChunkRuntimeRequirements(
			chunk: internals.Chunk,
			items: Set<string>
		): void;
		addTreeRuntimeRequirements(
			chunk: internals.Chunk,
			items: Iterable<string>
		): void;
		getModuleRuntimeRequirements(module: internals.Module): ReadonlySet<string>;
		getChunkRuntimeRequirements(chunk: internals.Chunk): ReadonlySet<string>;
		getTreeRuntimeRequirements(chunk: internals.Chunk): ReadonlySet<string>;
	}
	export abstract class ChunkGroup {
		groupDebugId: number;
		options: { preloadOrder?: number; prefetchOrder?: number; name: string };
		chunks: Array<internals.Chunk>;
		origins: Array<{
			module: internals.Module;
			loc:
				| internals.SyntheticDependencyLocation
				| internals.RealDependencyLocation;
			request: string;
		}>;
		index: number;

		/**
		 * when a new chunk is added to a chunkGroup, addingOptions will occur.
		 */
		addOptions(options: {
			preloadOrder?: number;
			prefetchOrder?: number;
			name: string;
		}): void;

		/**
		 * returns the name of current ChunkGroup
		 *
		 *
		 * sets a new name for current ChunkGroup
		 */
		name: string;

		/**
		 * get a uniqueId for ChunkGroup, made up of its member Chunk debugId's
		 */
		readonly debugId: string;

		/**
		 * get a unique id for ChunkGroup, made up of its member Chunk id's
		 */
		readonly id: string;

		/**
		 * Performs an unshift of a specific chunk
		 */
		unshiftChunk(chunk: internals.Chunk): boolean;

		/**
		 * inserts a chunk before another existing chunk in group
		 */
		insertChunk(chunk: internals.Chunk, before: internals.Chunk): boolean;

		/**
		 * add a chunk into ChunkGroup. Is pushed on or prepended
		 */
		pushChunk(chunk: internals.Chunk): boolean;
		replaceChunk(oldChunk: internals.Chunk, newChunk: internals.Chunk): boolean;
		removeChunk(chunk: internals.Chunk): boolean;
		isInitial(): boolean;
		addChild(group: internals.ChunkGroup): boolean;
		getChildren(): Array<internals.ChunkGroup>;
		getNumberOfChildren(): number;
		readonly childrenIterable: internals.SortableSet<internals.ChunkGroup>;
		removeChild(group: internals.ChunkGroup): boolean;
		addParent(parentChunk: internals.ChunkGroup): boolean;
		getParents(): Array<internals.ChunkGroup>;
		getNumberOfParents(): number;
		hasParent(parent: internals.ChunkGroup): boolean;
		readonly parentsIterable: internals.SortableSet<internals.ChunkGroup>;
		removeParent(chunkGroup: internals.ChunkGroup): boolean;
		getBlocks(): Array<any>;
		getNumberOfBlocks(): number;
		hasBlock(block?: any): boolean;
		readonly blocksIterable: Iterable<internals.AsyncDependenciesBlock>;
		addBlock(block: internals.AsyncDependenciesBlock): boolean;
		addOrigin(
			module: internals.Module,
			loc:
				| internals.SyntheticDependencyLocation
				| internals.RealDependencyLocation,
			request: string
		): void;
		getFiles(): Array<string>;
		remove(): void;
		sortItems(): void;

		/**
		 * Sorting predicate which allows current ChunkGroup to be compared against another.
		 * Sorting values are based off of number of chunks in ChunkGroup.
		 */
		compareTo(
			chunkGraph: internals.ChunkGraph,
			otherGroup: internals.ChunkGroup
		): 0 | 1 | -1;
		getChildrenByOrders(
			moduleGraph: internals.ModuleGraph,
			chunkGraph: internals.ChunkGraph
		): Record<string, Array<internals.ChunkGroup>>;

		/**
		 * Sets the top-down index of a module in this ChunkGroup
		 */
		setModulePreOrderIndex(module: internals.Module, index: number): void;

		/**
		 * Gets the top-down index of a module in this ChunkGroup
		 */
		getModulePreOrderIndex(module: internals.Module): number;

		/**
		 * Sets the bottom-up index of a module in this ChunkGroup
		 */
		setModulePostOrderIndex(module: internals.Module, index: number): void;

		/**
		 * Gets the bottom-up index of a module in this ChunkGroup
		 */
		getModulePostOrderIndex(module: internals.Module): number;
		checkConstraints(): void;
		getModuleIndex: (module: internals.Module) => number;
		getModuleIndex2: (module: internals.Module) => number;
	}
	export interface ChunkHashContext {
		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;
	}

	/**
	 * Compare two Modules based on their ids for sorting
	 */
	export interface ChunkMaps {
		hash: Record<string | number, string>;
		contentHash: Record<string | number, Record<string, string>>;
		name: Record<string | number, string>;
	}
	export class ChunkModuleIdRangePlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface ChunkModuleMaps {
		id: Record<string | number, Array<string | number>>;
		hash: Record<string | number, string>;
	}
	export interface ChunkPathData {
		id: string | number;
		name?: string;
		hash: string;
		hashWithLength?: (arg0: number) => string;
		contentHash?: Record<string, string>;
		contentHashWithLength?: Record<string, (length: number) => string>;
	}
	export interface ChunkSizeOptions {
		/**
		 * constant overhead for a chunk
		 */
		chunkOverhead?: number;

		/**
		 * multiplicator for initial chunks
		 */
		entryChunkMultiplicator?: number;
	}
	export abstract class ChunkTemplate {
		hooks: Readonly<{
			renderManifest: { tap: (options?: any, fn?: any) => void };
			modules: { tap: (options?: any, fn?: any) => void };
			render: { tap: (options?: any, fn?: any) => void };
			renderWithEntry: { tap: (options?: any, fn?: any) => void };
			hash: { tap: (options?: any, fn?: any) => void };
			hashForChunk: { tap: (options?: any, fn?: any) => void };
		}>;
		readonly outputOptions: any;
	}
	export interface CodeGenerationContext {
		/**
		 * the dependency templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;
	}
	export interface CodeGenerationResult {
		/**
		 * the resulting sources for all source types
		 */
		sources: Map<string, internals.Source>;

		/**
		 * the runtime requirements
		 */
		runtimeRequirements: ReadonlySet<string>;
	}
	export class Compilation {
		/**
		 * Creates an instance of Compilation.
		 */
		constructor(compiler: internals.Compiler);
		hooks: Readonly<{
			buildModule: SyncHook<[internals.Module], void>;
			rebuildModule: SyncHook<[internals.Module], void>;
			failedModule: SyncHook<[internals.Module, internals.WebpackError], void>;
			succeedModule: SyncHook<[internals.Module], void>;
			stillValidModule: SyncHook<[internals.Module], void>;
			addEntry: SyncHook<
				[
					internals.Dependency,
					{ name: string } & Pick<
						internals.EntryDescriptionNormalized,
						"dependOn" | "filename" | "library"
					>
				],
				void
			>;
			failedEntry: SyncHook<
				[
					internals.Dependency,
					{ name: string } & Pick<
						internals.EntryDescriptionNormalized,
						"dependOn" | "filename" | "library"
					>,
					Error
				],
				void
			>;
			succeedEntry: SyncHook<
				[
					internals.Dependency,
					{ name: string } & Pick<
						internals.EntryDescriptionNormalized,
						"dependOn" | "filename" | "library"
					>,
					internals.Module
				],
				void
			>;
			dependencyReferencedExports: SyncWaterfallHook<
				[Array<Array<string>>, internals.Dependency]
			>;
			finishModules: AsyncSeriesHook<[Iterable<internals.Module>]>;
			finishRebuildingModule: AsyncSeriesHook<[internals.Module]>;
			unseal: SyncHook<[], void>;
			seal: SyncHook<[], void>;
			beforeChunks: SyncHook<[], void>;
			afterChunks: SyncHook<[Iterable<internals.Chunk>], void>;
			optimizeDependencies: SyncBailHook<[Iterable<internals.Module>], any>;
			afterOptimizeDependencies: SyncHook<[Iterable<internals.Module>], void>;
			optimize: SyncHook<[], void>;
			optimizeModules: SyncBailHook<[Iterable<internals.Module>], any>;
			afterOptimizeModules: SyncHook<[Iterable<internals.Module>], void>;
			optimizeChunks: SyncBailHook<
				[Iterable<internals.Chunk>, Array<internals.ChunkGroup>],
				any
			>;
			afterOptimizeChunks: SyncHook<
				[Iterable<internals.Chunk>, Array<internals.ChunkGroup>],
				void
			>;
			optimizeTree: AsyncSeriesHook<
				[Iterable<internals.Chunk>, Iterable<internals.Module>]
			>;
			afterOptimizeTree: SyncHook<
				[Iterable<internals.Chunk>, Iterable<internals.Module>],
				void
			>;
			optimizeChunkModules: AsyncSeriesBailHook<
				[Iterable<internals.Chunk>, Iterable<internals.Module>],
				any
			>;
			afterOptimizeChunkModules: SyncHook<
				[Iterable<internals.Chunk>, Iterable<internals.Module>],
				void
			>;
			shouldRecord: SyncBailHook<[], boolean>;
			additionalChunkRuntimeRequirements: SyncHook<
				[internals.Chunk, Set<string>],
				void
			>;
			runtimeRequirementInChunk: HookMap<
				SyncBailHook<[internals.Chunk, Set<string>], any>
			>;
			additionalModuleRuntimeRequirements: SyncHook<
				[internals.Module, Set<string>],
				void
			>;
			runtimeRequirementInModule: HookMap<
				SyncBailHook<[internals.Module, Set<string>], any>
			>;
			additionalTreeRuntimeRequirements: SyncHook<
				[internals.Chunk, Set<string>],
				void
			>;
			runtimeRequirementInTree: HookMap<
				SyncBailHook<[internals.Chunk, Set<string>], any>
			>;
			runtimeModule: SyncHook<[internals.RuntimeModule, internals.Chunk], void>;
			reviveModules: SyncHook<[Iterable<internals.Module>, any], void>;
			beforeModuleIds: SyncHook<[Iterable<internals.Module>], void>;
			moduleIds: SyncHook<[Iterable<internals.Module>], void>;
			optimizeModuleIds: SyncHook<[Iterable<internals.Module>], void>;
			afterOptimizeModuleIds: SyncHook<[Iterable<internals.Module>], void>;
			reviveChunks: SyncHook<[Iterable<internals.Chunk>, any], void>;
			beforeChunkIds: SyncHook<[Iterable<internals.Chunk>], void>;
			chunkIds: SyncHook<[Iterable<internals.Chunk>], void>;
			optimizeChunkIds: SyncHook<[Iterable<internals.Chunk>], void>;
			afterOptimizeChunkIds: SyncHook<[Iterable<internals.Chunk>], void>;
			recordModules: SyncHook<[Iterable<internals.Module>, any], void>;
			recordChunks: SyncHook<[Iterable<internals.Chunk>, any], void>;
			optimizeCodeGeneration: SyncHook<[Iterable<internals.Module>], void>;
			beforeModuleHash: SyncHook<[], void>;
			afterModuleHash: SyncHook<[], void>;
			beforeCodeGeneration: SyncHook<[], void>;
			afterCodeGeneration: SyncHook<[], void>;
			beforeRuntimeRequirements: SyncHook<[], void>;
			afterRuntimeRequirements: SyncHook<[], void>;
			beforeHash: SyncHook<[], void>;
			contentHash: SyncHook<[internals.Chunk], void>;
			afterHash: SyncHook<[], void>;
			recordHash: SyncHook<[any], void>;
			record: SyncHook<[internals.Compilation, any], void>;
			beforeModuleAssets: SyncHook<[], void>;
			shouldGenerateChunkAssets: SyncBailHook<[], boolean>;
			beforeChunkAssets: SyncHook<[], void>;
			additionalChunkAssets: SyncHook<[Iterable<internals.Chunk>], void>;
			additionalAssets: AsyncSeriesHook<[]>;
			optimizeChunkAssets: AsyncSeriesHook<[Iterable<internals.Chunk>]>;
			afterOptimizeChunkAssets: SyncHook<[Iterable<internals.Chunk>], void>;
			optimizeAssets: AsyncSeriesHook<[Record<string, internals.Source>]>;
			afterOptimizeAssets: SyncHook<[Record<string, internals.Source>], void>;
			finishAssets: AsyncSeriesHook<[Record<string, internals.Source>]>;
			afterFinishAssets: SyncHook<[Record<string, internals.Source>], void>;
			needAdditionalSeal: SyncBailHook<[], boolean>;
			afterSeal: AsyncSeriesHook<[]>;
			renderManifest: SyncWaterfallHook<
				[Array<internals.RenderManifestEntry>, internals.RenderManifestOptions]
			>;
			fullHash: SyncHook<[internals.Hash], void>;
			chunkHash: SyncHook<
				[internals.Chunk, internals.Hash, internals.ChunkHashContext],
				void
			>;
			moduleAsset: SyncHook<[internals.Module, string], void>;
			chunkAsset: SyncHook<[internals.Chunk, string], void>;
			assetPath: SyncWaterfallHook<[string, any, internals.AssetInfo]>;
			needAdditionalPass: SyncBailHook<[], boolean>;
			childCompiler: SyncHook<[internals.Compiler, string, number], void>;
			log: SyncBailHook<[string, internals.LogEntry], true>;
			statsPreset: HookMap<SyncHook<[any, any], void>>;
			statsNormalize: SyncHook<[any, any], void>;
			statsFactory: SyncHook<[internals.StatsFactory, any], void>;
			statsPrinter: SyncHook<[internals.StatsPrinter, any], void>;
			readonly normalModuleLoader: SyncHook<
				[any, internals.NormalModule],
				void
			>;
		}>;
		name: string;
		compiler: internals.Compiler;
		resolverFactory: internals.ResolverFactory;
		inputFileSystem: internals.InputFileSystem;
		fileSystemInfo: internals.FileSystemInfo;
		requestShortener: internals.RequestShortener;
		compilerPath: string;
		cache: internals.Cache;
		logger: internals.WebpackLogger;
		options: internals.WebpackOptionsNormalized;
		outputOptions: internals.OutputNormalized;
		bail: boolean;
		profile: boolean;
		mainTemplate: internals.MainTemplate;
		chunkTemplate: internals.ChunkTemplate;
		runtimeTemplate: internals.RuntimeTemplate;
		moduleTemplates: { javascript: internals.ModuleTemplate };
		moduleGraph: internals.ModuleGraph;
		chunkGraph: internals.ChunkGraph;
		codeGenerationResults: Map<
			internals.Module,
			internals.CodeGenerationResult
		>;
		factorizeQueue: internals.AsyncQueue<
			internals.FactorizeModuleOptions,
			string,
			internals.Module
		>;
		addModuleQueue: internals.AsyncQueue<
			internals.Module,
			string,
			internals.Module
		>;
		buildQueue: internals.AsyncQueue<
			internals.Module,
			internals.Module,
			internals.Module
		>;
		rebuildQueue: internals.AsyncQueue<
			internals.Module,
			internals.Module,
			internals.Module
		>;
		processDependenciesQueue: internals.AsyncQueue<
			internals.Module,
			internals.Module,
			internals.Module
		>;

		/**
		 * Modules in value are building during the build of Module in key.
		 * Means value blocking key from finishing.
		 * Needed to detect build cycles.
		 */
		creatingModuleDuringBuild: WeakMap<internals.Module, Set<internals.Module>>;
		entries: Map<string, internals.EntryData>;
		entrypoints: Map<string, internals.Entrypoint>;
		chunks: Set<internals.Chunk>;
		chunkGroups: Array<internals.ChunkGroup>;
		namedChunkGroups: Map<string, internals.ChunkGroup>;
		namedChunks: Map<string, internals.Chunk>;
		modules: Set<internals.Module>;
		records: any;
		additionalChunkAssets: Array<string>;
		assets: Record<string, internals.Source>;
		assetsInfo: Map<string, internals.AssetInfo>;
		errors: Array<internals.WebpackError>;
		warnings: Array<internals.WebpackError>;
		children: Array<internals.Compilation>;
		logging: Map<string, Array<internals.LogEntry>>;
		dependencyFactories: Map<
			{ new (...args: Array<any>): internals.Dependency },
			internals.ModuleFactory
		>;
		dependencyTemplates: internals.DependencyTemplates;
		childrenCounters: {};
		usedChunkIds: Set<string | number>;
		usedModuleIds: Set<number>;
		needAdditionalPass: boolean;
		builtModules: WeakSet<internals.Module>;
		emittedAssets: Set<string>;
		comparedForEmitAssets: Set<string>;
		fileDependencies: internals.LazySet<string>;
		contextDependencies: internals.LazySet<string>;
		missingDependencies: internals.LazySet<string>;
		buildDependencies: internals.LazySet<string>;
		compilationDependencies: { add: (item?: any) => internals.LazySet<string> };
		getStats(): internals.Stats;
		createStatsOptions(optionsOrPreset?: any, context?: {}): {};
		createStatsFactory(options?: any): internals.StatsFactory;
		createStatsPrinter(options?: any): internals.StatsPrinter;
		getLogger(name: string | (() => string)): internals.WebpackLogger;
		addModule(
			module: internals.Module,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;

		/**
		 * Fetches a module from a compilation by its identifier
		 */
		getModule(module: internals.Module): internals.Module;

		/**
		 * Attempts to search for a module by its identifier
		 */
		findModule(identifier: string): internals.Module;

		/**
		 * Schedules a build of the module object
		 */
		buildModule(
			module: internals.Module,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		processModuleDependencies(
			module: internals.Module,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		handleModuleCreation(
			__0: internals.HandleModuleCreationOptions,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		factorizeModule(
			options: internals.FactorizeModuleOptions,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		addModuleChain(
			context: string,
			dependency: internals.Dependency,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		addEntry(
			context: string,
			entry: internals.EntryDependency,
			optionsOrName:
				| string
				| ({ name: string } & Pick<
						internals.EntryDescriptionNormalized,
						"dependOn" | "filename" | "library"
				  >),
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		rebuildModule(
			module: internals.Module,
			callback: (
				err?: internals.WebpackError,
				result?: internals.Module
			) => void
		): void;
		finish(callback?: any): void;
		unseal(): void;
		seal(callback: (err?: internals.WebpackError) => void): void;
		reportDependencyErrorsAndWarnings(
			module: internals.Module,
			blocks: Array<internals.DependenciesBlock>
		): void;
		codeGeneration(): Map<any, any>;
		processRuntimeRequirements(
			entrypoints: Iterable<internals.Entrypoint>
		): void;
		addRuntimeModule(
			chunk: internals.Chunk,
			module: internals.RuntimeModule
		): void;
		addChunkInGroup(
			groupOptions:
				| string
				| { preloadOrder?: number; prefetchOrder?: number; name: string },
			module: internals.Module,
			loc:
				| internals.SyntheticDependencyLocation
				| internals.RealDependencyLocation,
			request: string
		): internals.ChunkGroup;

		/**
		 * This method first looks to see if a name is provided for a new chunk,
		 * and first looks to see if any named chunks already exist and reuse that chunk instead.
		 */
		addChunk(name: string): internals.Chunk;
		assignDepth(module: internals.Module): void;
		getDependencyReferencedExports(
			dependency: internals.Dependency
		): Array<Array<string>>;
		removeReasonsOfDependencyBlock(
			module: internals.Module,
			block: internals.DependenciesBlockLike
		): void;
		patchChunksAfterReasonRemoval(
			module: internals.Module,
			chunk: internals.Chunk
		): void;
		removeChunkFromDependencies(
			block: internals.DependenciesBlock,
			chunk: internals.Chunk
		): void;
		sortItemsWithChunkIds(): void;
		summarizeDependencies(): void;
		createModuleHashes(): void;
		createHash(): void;
		fullHash: string;
		hash: string;
		modifyHash(update: string): void;
		emitAsset(
			file: string,
			source: internals.Source,
			assetInfo?: internals.AssetInfo
		): void;
		updateAsset(
			file: string,
			newSourceOrFunction:
				| internals.Source
				| ((arg0: internals.Source) => internals.Source),
			assetInfoUpdateOrFunction?:
				| internals.AssetInfo
				| ((arg0: internals.AssetInfo) => internals.AssetInfo)
		): void;
		getAssets(): Array<internals.Asset>;
		getAsset(name: string): internals.Asset;
		clearAssets(): void;
		createModuleAssets(): void;
		getRenderManifest(
			options: internals.RenderManifestOptions
		): Array<internals.RenderManifestEntry>;
		createChunkAssets(callback: (err?: internals.WebpackError) => void): void;
		getPath(
			filename:
				| string
				| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string),
			data?: internals.PathData
		): string;
		getPathWithInfo(
			filename:
				| string
				| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string),
			data?: internals.PathData
		): { path: string; info: internals.AssetInfo };
		getAssetPath(
			filename:
				| string
				| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string),
			data: internals.PathData
		): string;
		getAssetPathWithInfo(
			filename:
				| string
				| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string),
			data: internals.PathData
		): { path: string; info: internals.AssetInfo };

		/**
		 * This function allows you to run another instance of webpack inside of webpack however as
		 * a child with different settings and configurations (if desired) applied. It copies all hooks, plugins
		 * from parent (or top level compiler) and creates a child Compilation
		 */
		createChildCompiler(
			name: string,
			outputOptions: internals.OutputNormalized,
			plugins: Array<internals.Plugin>
		): internals.Compiler;
		checkConstraints(): void;
	}
	export interface CompilationHooksAsyncWebAssemblyModulesPlugin {
		renderModuleContent: SyncWaterfallHook<
			[
				internals.Source,
				internals.Module,
				internals.RenderContextAsyncWebAssemblyModulesPlugin
			]
		>;
	}
	export interface CompilationHooksJavascriptModulesPlugin {
		renderModuleContent: SyncWaterfallHook<
			[
				internals.Source,
				internals.Module,
				internals.RenderContextJavascriptModulesPlugin
			]
		>;
		renderModuleContainer: SyncWaterfallHook<
			[
				internals.Source,
				internals.Module,
				internals.RenderContextJavascriptModulesPlugin
			]
		>;
		renderModulePackage: SyncWaterfallHook<
			[
				internals.Source,
				internals.Module,
				internals.RenderContextJavascriptModulesPlugin
			]
		>;
		renderChunk: SyncWaterfallHook<
			[internals.Source, internals.RenderContextJavascriptModulesPlugin]
		>;
		renderMain: SyncWaterfallHook<
			[internals.Source, internals.RenderContextJavascriptModulesPlugin]
		>;
		render: SyncWaterfallHook<
			[internals.Source, internals.RenderContextJavascriptModulesPlugin]
		>;
		renderRequire: SyncWaterfallHook<
			[string, internals.RenderBootstrapContext]
		>;
		chunkHash: SyncHook<
			[internals.Chunk, internals.Hash, internals.ChunkHashContext],
			void
		>;
	}
	export interface CompilationParams {
		normalModuleFactory: internals.NormalModuleFactory;
		contextModuleFactory: internals.ContextModuleFactory;
	}
	export class Compiler {
		constructor(context: string);
		hooks: Readonly<{
			initialize: SyncHook<[], void>;
			shouldEmit: SyncBailHook<[internals.Compilation], boolean>;
			done: AsyncSeriesHook<[internals.Stats]>;
			afterDone: SyncHook<[internals.Stats], void>;
			additionalPass: AsyncSeriesHook<[]>;
			beforeRun: AsyncSeriesHook<[internals.Compiler]>;
			run: AsyncSeriesHook<[internals.Compiler]>;
			emit: AsyncSeriesHook<[internals.Compilation]>;
			assetEmitted: AsyncSeriesHook<[string, internals.AssetEmittedInfo]>;
			afterEmit: AsyncSeriesHook<[internals.Compilation]>;
			thisCompilation: SyncHook<
				[internals.Compilation, internals.CompilationParams],
				void
			>;
			compilation: SyncHook<
				[internals.Compilation, internals.CompilationParams],
				void
			>;
			normalModuleFactory: SyncHook<[internals.NormalModuleFactory], void>;
			contextModuleFactory: SyncHook<[internals.ContextModuleFactory], void>;
			beforeCompile: AsyncSeriesHook<[internals.CompilationParams]>;
			compile: SyncHook<[internals.CompilationParams], void>;
			make: AsyncParallelHook<[internals.Compilation]>;
			afterCompile: AsyncSeriesHook<[internals.Compilation]>;
			watchRun: AsyncSeriesHook<[internals.Compiler]>;
			failed: SyncHook<[Error], void>;
			invalid: SyncHook<[string, string], void>;
			watchClose: SyncHook<[], void>;
			infrastructureLog: SyncBailHook<[string, string, Array<any>], true>;
			environment: SyncHook<[], void>;
			afterEnvironment: SyncHook<[], void>;
			afterPlugins: SyncHook<[internals.Compiler], void>;
			afterResolvers: SyncHook<[internals.Compiler], void>;
			entryOption: SyncBailHook<
				[
					string,
					(
						| (() => Promise<internals.EntryStaticNormalized>)
						| internals.EntryStaticNormalized
					)
				],
				boolean
			>;
		}>;
		name: string;
		parentCompilation: internals.Compilation;
		root: internals.Compiler;
		outputPath: string;
		outputFileSystem: internals.OutputFileSystem;
		intermediateFileSystem: internals.InputFileSystem &
			internals.OutputFileSystem &
			internals.IntermediateFileSystemExtras;
		inputFileSystem: internals.InputFileSystem;
		watchFileSystem: any;
		recordsInputPath: string;
		recordsOutputPath: string;
		records: {};
		managedPaths: Set<string>;
		immutablePaths: Set<string>;
		modifiedFiles: Set<string>;
		removedFiles: Set<string>;
		fileTimestamps: Map<string, internals.FileSystemInfoEntry>;
		contextTimestamps: Map<string, internals.FileSystemInfoEntry>;
		resolverFactory: internals.ResolverFactory;
		infrastructureLogger: any;
		options: internals.WebpackOptionsNormalized;
		context: string;
		requestShortener: internals.RequestShortener;
		cache: internals.Cache;
		compilerPath: string;
		running: boolean;
		watchMode: boolean;
		getInfrastructureLogger(
			name: string | (() => string)
		): internals.WebpackLogger;
		watch(
			watchOptions: internals.WatchOptions,
			handler: internals.CallbackCompiler<internals.Stats>
		): internals.Watching;
		run(callback: internals.CallbackCompiler<internals.Stats>): void;
		runAsChild(
			callback: (
				err?: Error,
				entries?: Array<internals.Chunk>,
				compilation?: internals.Compilation
			) => any
		): void;
		purgeInputFileSystem(): void;
		emitAssets(
			compilation: internals.Compilation,
			callback: internals.CallbackCompiler<void>
		): void;
		emitRecords(callback: internals.CallbackCompiler<void>): void;
		readRecords(callback: internals.CallbackCompiler<void>): void;
		createChildCompiler(
			compilation: internals.Compilation,
			compilerName: string,
			compilerIndex: number,
			outputOptions: internals.OutputNormalized,
			plugins: Array<internals.WebpackPluginInstance>
		): internals.Compiler;
		isChild(): boolean;
		createCompilation(): internals.Compilation;
		newCompilation(params: internals.CompilationParams): internals.Compilation;
		createNormalModuleFactory(): internals.NormalModuleFactory;
		createContextModuleFactory(): internals.ContextModuleFactory;
		newCompilationParams(): {
			normalModuleFactory: internals.NormalModuleFactory;
			contextModuleFactory: internals.ContextModuleFactory;
		};
		compile(callback: internals.CallbackCompiler<internals.Compilation>): void;
		close(callback: internals.CallbackCompiler<void>): void;
	}
	export class ContextExclusionPlugin {
		constructor(negativeMatcher: RegExp);
		negativeMatcher: RegExp;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export abstract class ContextModuleFactory extends internals.ModuleFactory {
		hooks: Readonly<{
			beforeResolve: AsyncSeriesWaterfallHook<[any]>;
			afterResolve: AsyncSeriesWaterfallHook<[any]>;
			contextModuleFiles: SyncWaterfallHook<[Array<string>]>;
			alternatives: AsyncSeriesWaterfallHook<[Array<any>]>;
		}>;
		resolverFactory: any;
		resolveDependencies(fs?: any, options?: any, callback?: any): any;
	}
	export class ContextReplacementPlugin {
		constructor(
			resourceRegExp?: any,
			newContentResource?: any,
			newContentRecursive?: any,
			newContentRegExp?: any
		);
		resourceRegExp: any;
		newContentCallback: any;
		newContentResource: any;
		newContentCreateContextMap: any;
		newContentRecursive: any;
		newContentRegExp: any;
		apply(compiler?: any): void;
	}
	export type CrossOriginLoading = false | "anonymous" | "use-credentials";
	export type Declaration =
		| FunctionDeclaration
		| VariableDeclaration
		| ClassDeclaration;
	export class DefinePlugin {
		/**
		 * Create a new define plugin
		 */
		constructor(
			definitions: Record<
				string,
				| string
				| number
				| bigint
				| boolean
				| Function
				| RegExp
				| internals.RuntimeValue
				| { [index: string]: RecursiveArrayOrRecordDeclarations }
				| Array<RecursiveArrayOrRecordDeclarations>
			>
		);
		definitions: Record<
			string,
			| string
			| number
			| bigint
			| boolean
			| Function
			| RegExp
			| internals.RuntimeValue
			| { [index: string]: RecursiveArrayOrRecordDeclarations }
			| Array<RecursiveArrayOrRecordDeclarations>
		>;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static runtimeValue(
			fn?: any,
			fileDependencies?: any
		): internals.RuntimeValue;
	}
	export class DelegatedPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export abstract class DependenciesBlock {
		dependencies: Array<internals.Dependency>;
		blocks: Array<internals.AsyncDependenciesBlock>;

		/**
		 * Adds a DependencyBlock to DependencyBlock relationship.
		 * This is used for when a Module has a AsyncDependencyBlock tie (for code-splitting)
		 */
		addBlock(block: internals.AsyncDependenciesBlock): void;
		addDependency(dependency: internals.Dependency): void;
		removeDependency(dependency: internals.Dependency): void;

		/**
		 * Removes all dependencies and blocks
		 */
		clearDependenciesAndBlocks(): void;

		/**
		 * Update the hash
		 */
		updateHash(hash: internals.Hash, chunkGraph: internals.ChunkGraph): void;
		serialize(__0: { write: any }): void;
		deserialize(__0: { read: any }): void;
	}
	export interface DependenciesBlockLike {
		dependencies: Array<internals.Dependency>;
		blocks: Array<internals.AsyncDependenciesBlock>;
	}
	export class Dependency {
		constructor();
		weak: boolean;
		optional: boolean;
		loc:
			| internals.SyntheticDependencyLocation
			| internals.RealDependencyLocation;
		readonly type: string;
		getResourceIdentifier(): string;
		getReference(moduleGraph: internals.ModuleGraph): never;

		/**
		 * Returns list of exports referenced by this dependency
		 */
		getReferencedExports(
			moduleGraph: internals.ModuleGraph
		): Array<Array<string>>;
		getCondition(moduleGraph: internals.ModuleGraph): () => boolean;

		/**
		 * Returns the exported names
		 */
		getExports(moduleGraph: internals.ModuleGraph): internals.ExportsSpec;

		/**
		 * Returns warnings
		 */
		getWarnings(
			moduleGraph: internals.ModuleGraph
		): Array<internals.WebpackError>;

		/**
		 * Returns errors
		 */
		getErrors(
			moduleGraph: internals.ModuleGraph
		): Array<internals.WebpackError>;

		/**
		 * Update the hash
		 */
		updateHash(hash: internals.Hash, chunkGraph: internals.ChunkGraph): void;

		/**
		 * implement this method to allow the occurrence order plugin to count correctly
		 */
		getNumberOfIdOccurrences(): number;
		serialize(__0: { write: any }): void;
		deserialize(__0: { read: any }): void;
		module: any;
		readonly disconnect: any;
		static NO_EXPORTS_REFERENCED: Array<any>;
		static NS_OBJECT_REFERENCED: Array<Array<any>>;
		static DEFAULT_EXPORT_REFERENCED: Array<Array<string>>;
	}
	export abstract class DependencyTemplate {
		apply(
			dependency: internals.Dependency,
			source: internals.ReplaceSource,
			templateContext: internals.DependencyTemplateContext
		): void;
	}
	export interface DependencyTemplateContext {
		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;

		/**
		 * the requirements for runtime
		 */
		runtimeRequirements: Set<string>;

		/**
		 * current module
		 */
		module: internals.Module;

		/**
		 * mutable array of init fragments for the current module
		 */
		initFragments: Array<internals.InitFragment>;
	}
	export abstract class DependencyTemplates {
		get(dependency: {
			new (...args: Array<any>): internals.Dependency;
		}): internals.DependencyTemplate;
		set(
			dependency: { new (...args: Array<any>): internals.Dependency },
			dependencyTemplate: internals.DependencyTemplate
		): void;
		updateHash(part: string): void;
		getHash(): string;
		clone(): internals.DependencyTemplates;
	}
	export class DeterministicModuleIdsPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * Options for the webpack-dev-server.
	 */
	export interface DevServer {
		[index: string]: any;
	}
	export type DevTool = string | false;
	export type DevtoolFallbackModuleFilenameTemplate = string | Function;
	export class DllPlugin {
		constructor(options: internals.DllPluginOptions);
		options: {
			entryOnly: boolean;
			/**
			 * Context of requests in the manifest file (defaults to the webpack context).
			 */
			context?: string;
			/**
			 * If true, manifest json file (output) will be formatted.
			 */
			format?: boolean;
			/**
			 * Name of the exposed dll function (external name, use value of 'output.library').
			 */
			name?: string;
			/**
			 * Absolute path to the manifest json file (output).
			 */
			path: string;
			/**
			 * Type of the dll bundle (external type, use value of 'output.libraryTarget').
			 */
			type?: string;
		};

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface DllPluginOptions {
		/**
		 * Context of requests in the manifest file (defaults to the webpack context).
		 */
		context?: string;

		/**
		 * If true, only entry points will be exposed (default: true).
		 */
		entryOnly?: boolean;

		/**
		 * If true, manifest json file (output) will be formatted.
		 */
		format?: boolean;

		/**
		 * Name of the exposed dll function (external name, use value of 'output.library').
		 */
		name?: string;

		/**
		 * Absolute path to the manifest json file (output).
		 */
		path: string;

		/**
		 * Type of the dll bundle (external type, use value of 'output.libraryTarget').
		 */
		type?: string;
	}
	export class DllReferencePlugin {
		constructor(
			options:
				| {
						/**
						 * Context of requests in the manifest (or content property) as absolute path.
						 */
						context?: string;
						/**
						 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
						 */
						extensions?: Array<string>;
						/**
						 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
						 */
						manifest: string | internals.DllReferencePluginOptionsManifest;
						/**
						 * The name where the dll is exposed (external name, defaults to manifest.name).
						 */
						name?: string;
						/**
						 * Prefix which is used for accessing the content of the dll.
						 */
						scope?: string;
						/**
						 * How the dll is exposed (libraryTarget, defaults to manifest.type).
						 */
						sourceType?:
							| "var"
							| "assign"
							| "this"
							| "window"
							| "global"
							| "commonjs"
							| "commonjs2"
							| "commonjs-module"
							| "amd"
							| "amd-require"
							| "umd"
							| "umd2"
							| "jsonp"
							| "system";
						/**
						 * The way how the export of the dll bundle is used.
						 */
						type?: "object" | "require";
				  }
				| {
						/**
						 * The mappings from request to module info.
						 */
						content: internals.DllReferencePluginOptionsContent;
						/**
						 * Context of requests in the manifest (or content property) as absolute path.
						 */
						context?: string;
						/**
						 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
						 */
						extensions?: Array<string>;
						/**
						 * The name where the dll is exposed (external name).
						 */
						name: string;
						/**
						 * Prefix which is used for accessing the content of the dll.
						 */
						scope?: string;
						/**
						 * How the dll is exposed (libraryTarget).
						 */
						sourceType?:
							| "var"
							| "assign"
							| "this"
							| "window"
							| "global"
							| "commonjs"
							| "commonjs2"
							| "commonjs-module"
							| "amd"
							| "amd-require"
							| "umd"
							| "umd2"
							| "jsonp"
							| "system";
						/**
						 * The way how the export of the dll bundle is used.
						 */
						type?: "object" | "require";
				  }
		);
		options:
			| {
					/**
					 * Context of requests in the manifest (or content property) as absolute path.
					 */
					context?: string;
					/**
					 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
					 */
					extensions?: Array<string>;
					/**
					 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
					 */
					manifest: string | internals.DllReferencePluginOptionsManifest;
					/**
					 * The name where the dll is exposed (external name, defaults to manifest.name).
					 */
					name?: string;
					/**
					 * Prefix which is used for accessing the content of the dll.
					 */
					scope?: string;
					/**
					 * How the dll is exposed (libraryTarget, defaults to manifest.type).
					 */
					sourceType?:
						| "var"
						| "assign"
						| "this"
						| "window"
						| "global"
						| "commonjs"
						| "commonjs2"
						| "commonjs-module"
						| "amd"
						| "amd-require"
						| "umd"
						| "umd2"
						| "jsonp"
						| "system";
					/**
					 * The way how the export of the dll bundle is used.
					 */
					type?: "object" | "require";
			  }
			| {
					/**
					 * The mappings from request to module info.
					 */
					content: internals.DllReferencePluginOptionsContent;
					/**
					 * Context of requests in the manifest (or content property) as absolute path.
					 */
					context?: string;
					/**
					 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
					 */
					extensions?: Array<string>;
					/**
					 * The name where the dll is exposed (external name).
					 */
					name: string;
					/**
					 * Prefix which is used for accessing the content of the dll.
					 */
					scope?: string;
					/**
					 * How the dll is exposed (libraryTarget).
					 */
					sourceType?:
						| "var"
						| "assign"
						| "this"
						| "window"
						| "global"
						| "commonjs"
						| "commonjs2"
						| "commonjs-module"
						| "amd"
						| "amd-require"
						| "umd"
						| "umd2"
						| "jsonp"
						| "system";
					/**
					 * The way how the export of the dll bundle is used.
					 */
					type?: "object" | "require";
			  };
		apply(compiler?: any): void;
	}
	export type DllReferencePluginOptions =
		| {
				/**
				 * Context of requests in the manifest (or content property) as absolute path.
				 */
				context?: string;
				/**
				 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
				 */
				extensions?: Array<string>;
				/**
				 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
				 */
				manifest: string | internals.DllReferencePluginOptionsManifest;
				/**
				 * The name where the dll is exposed (external name, defaults to manifest.name).
				 */
				name?: string;
				/**
				 * Prefix which is used for accessing the content of the dll.
				 */
				scope?: string;
				/**
				 * How the dll is exposed (libraryTarget, defaults to manifest.type).
				 */
				sourceType?:
					| "var"
					| "assign"
					| "this"
					| "window"
					| "global"
					| "commonjs"
					| "commonjs2"
					| "commonjs-module"
					| "amd"
					| "amd-require"
					| "umd"
					| "umd2"
					| "jsonp"
					| "system";
				/**
				 * The way how the export of the dll bundle is used.
				 */
				type?: "object" | "require";
		  }
		| {
				/**
				 * The mappings from request to module info.
				 */
				content: internals.DllReferencePluginOptionsContent;
				/**
				 * Context of requests in the manifest (or content property) as absolute path.
				 */
				context?: string;
				/**
				 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
				 */
				extensions?: Array<string>;
				/**
				 * The name where the dll is exposed (external name).
				 */
				name: string;
				/**
				 * Prefix which is used for accessing the content of the dll.
				 */
				scope?: string;
				/**
				 * How the dll is exposed (libraryTarget).
				 */
				sourceType?:
					| "var"
					| "assign"
					| "this"
					| "window"
					| "global"
					| "commonjs"
					| "commonjs2"
					| "commonjs-module"
					| "amd"
					| "amd-require"
					| "umd"
					| "umd2"
					| "jsonp"
					| "system";
				/**
				 * The way how the export of the dll bundle is used.
				 */
				type?: "object" | "require";
		  };

	/**
	 * The mappings from request to module info.
	 */
	export interface DllReferencePluginOptionsContent {
		[index: string]: {
			/**
			 * Meta information about the module.
			 */
			buildMeta?: { [index: string]: any };
			/**
			 * Information about the provided exports of the module.
			 */
			exports?: true | Array<string>;
			/**
			 * Module ID.
			 */
			id: string | number;
		};
	}

	/**
	 * An object containing content, name and type.
	 */
	export interface DllReferencePluginOptionsManifest {
		/**
		 * The mappings from request to module info.
		 */
		content: internals.DllReferencePluginOptionsContent;

		/**
		 * The name where the dll is exposed (external name).
		 */
		name?: string;

		/**
		 * The type how the dll is exposed (external type).
		 */
		type?:
			| "var"
			| "assign"
			| "this"
			| "window"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system";
	}
	export type DllReferencePluginOptionsSourceType =
		| "var"
		| "assign"
		| "this"
		| "window"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "jsonp"
		| "system";
	export interface Effect {
		type: string;
		value: any;
	}
	export class EnableLibraryPlugin {
		constructor(
			type:
				| "var"
				| "module"
				| "assign"
				| "this"
				| "window"
				| "self"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system"
		);
		type:
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system";

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static checkEnabled(
			compiler: internals.Compiler,
			type:
				| "var"
				| "module"
				| "assign"
				| "this"
				| "window"
				| "self"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system"
		): void;
	}
	export type Entry =
		| string
		| (() =>
				| string
				| internals.EntryObject
				| [string, string]
				| Promise<string | internals.EntryObject | [string, string]>)
		| internals.EntryObject
		| [string, string];
	export interface EntryData {
		/**
		 * dependencies of the entrypoint
		 */
		dependencies: Array<internals.EntryDependency>;

		/**
		 * options of the entrypoint
		 */
		options: { name: string } & Pick<
			internals.EntryDescriptionNormalized,
			"dependOn" | "filename" | "library"
		>;
	}
	export abstract class EntryDependency extends internals.ModuleDependency {}

	/**
	 * An object with entry point description.
	 */
	export interface EntryDescription {
		/**
		 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
		 */
		dependOn?: string | [string, string];

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * Module(s) that are loaded upon startup.
		 */
		import: string | [string, string];

		/**
		 * Options for library.
		 */
		library?: internals.LibraryOptions;
	}

	/**
	 * An object with entry point description.
	 */
	export interface EntryDescriptionNormalized {
		/**
		 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
		 */
		dependOn?: [string, string];

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * Module(s) that are loaded upon startup. The last one is exported.
		 */
		import: [string, string];

		/**
		 * Options for library.
		 */
		library?: internals.LibraryOptions;
	}
	export type EntryItem = string | [string, string];
	export type EntryNormalized =
		| (() => Promise<internals.EntryStaticNormalized>)
		| internals.EntryStaticNormalized;

	/**
	 * Multiple entry bundles are created. The key is the entry name. The value can be a string, an array or an entry description object.
	 */
	export interface EntryObject {
		[index: string]: string | [string, string] | internals.EntryDescription;
	}
	export class EntryPlugin {
		/**
		 * An entry plugin which will handle
		 * creation of the EntryDependency
		 */
		constructor(
			context: string,
			entry: string,
			options:
				| string
				| ({ name: string } & Pick<
						internals.EntryDescriptionNormalized,
						"dependOn" | "filename" | "library"
				  >)
		);
		context: string;
		entry: string;
		options:
			| string
			| ({ name: string } & Pick<
					internals.EntryDescriptionNormalized,
					"dependOn" | "filename" | "library"
			  >);

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static createDependency(
			entry: string,
			options:
				| string
				| ({ name: string } & Pick<
						internals.EntryDescriptionNormalized,
						"dependOn" | "filename" | "library"
				  >)
		): internals.EntryDependency;
	}
	export type EntryStatic = string | internals.EntryObject | [string, string];

	/**
	 * Multiple entry bundles are created. The key is the entry name. The value is an entry description object.
	 */
	export interface EntryStaticNormalized {
		[index: string]: internals.EntryDescriptionNormalized;
	}
	export abstract class Entrypoint extends internals.ChunkGroup {
		runtimeChunk: internals.Chunk;

		/**
		 * Sets the runtimeChunk for an entrypoint.
		 */
		setRuntimeChunk(chunk: internals.Chunk): void;

		/**
		 * Fetches the chunk reference containing the webpack bootstrap code
		 */
		getRuntimeChunk(): internals.Chunk;
	}
	export class EnvironmentPlugin {
		constructor(...keys: Array<any>);
		keys: Array<any>;
		defaultValues: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface Etag {
		toString: () => string;
	}
	export class EvalDevToolModulePlugin {
		constructor(options?: any);
		namespace: any;
		sourceUrlComment: any;
		moduleFilenameTemplate: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class EvalSourceMapDevToolPlugin {
		constructor(options?: any);
		sourceMapComment: any;
		moduleFilenameTemplate: any;
		namespace: any;
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	export interface Experiments {
		/**
		 * Allow module type 'asset' to generate assets.
		 */
		asset?: boolean;

		/**
		 * Support WebAssembly as asynchronous EcmaScript Module.
		 */
		asyncWebAssembly?: boolean;

		/**
		 * Allow 'import/export' syntax to import async modules.
		 */
		importAsync?: boolean;

		/**
		 * Allow 'import/export await' syntax to import async modules.
		 */
		importAwait?: boolean;

		/**
		 * Support .mjs files as way to define strict ESM file (node.js).
		 */
		mjs?: boolean;

		/**
		 * Allow output javascript files as module source type.
		 */
		outputModule?: boolean;

		/**
		 * Support WebAssembly as synchronous EcmaScript Module (outdated).
		 */
		syncWebAssembly?: boolean;

		/**
		 * Allow using top-level-await in EcmaScript Modules.
		 */
		topLevelAwait?: boolean;
	}
	export abstract class ExportInfo {
		name: string;
		usedName: string | typeof internals.SKIP_OVER_NAME;
		used: 0 | 1 | 2 | 3 | 4;

		/**
		 * true: it is provided
		 * false: it is not provided
		 * null: only the runtime knows if it is provided
		 * undefined: it was not determined if it is provided
		 */
		provided: boolean;

		/**
		 * true: it can be mangled
		 * false: is can not be mangled
		 * undefined: it was not determined if it can be mangled
		 */
		canMangleProvide: boolean;

		/**
		 * true: it can be mangled
		 * false: is can not be mangled
		 * undefined: it was not determined if it can be mangled
		 */
		canMangleUse: boolean;
		exportsInfoOwned: boolean;
		exportsInfo: internals.ExportsInfo;
		readonly canMangle: boolean;
		getUsedName(fallbackName?: any): any;
		createNestedExportsInfo(): internals.ExportsInfo;
		getNestedExportsInfo(): internals.ExportsInfo;
		getUsedInfo():
			| "used"
			| "no usage info"
			| "maybe used (runtime-defined)"
			| "unused"
			| "only properties used";
		getProvidedInfo():
			| "no provided info"
			| "maybe provided (runtime-defined)"
			| "provided"
			| "not provided";
		getRenameInfo(): string;
	}
	export interface ExportSpec {
		/**
		 * the name of the export
		 */
		name: string;

		/**
		 * can the export be renamed (defaults to true)
		 */
		canMangle?: boolean;

		/**
		 * nested exports
		 */
		exports?: Array<string | internals.ExportSpec>;

		/**
		 * when reexported: from which module
		 */
		from?: internals.Module;

		/**
		 * when reexported: from which export
		 */
		export?: Array<string>;
	}
	export abstract class ExportsInfo {
		readonly ownedExports: Iterable<internals.ExportInfo>;
		readonly exports: Iterable<internals.ExportInfo>;
		readonly orderedExports: Iterable<internals.ExportInfo>;
		readonly otherExportsInfo: internals.ExportInfo;
		setRedirectNamedTo(exportsInfo?: any): void;
		setHasProvideInfo(): void;
		setHasUseInfo(): void;
		getExportInfo(name: string): internals.ExportInfo;
		getReadOnlyExportInfo(name: string): internals.ExportInfo;
		getNestedExportsInfo(name: Array<string>): internals.ExportsInfo;
		setUnknownExportsProvided(canMangle: boolean): boolean;
		setUsedInUnknownWay(): boolean;
		setAllKnownExportsUsed(): boolean;
		setUsedForSideEffectsOnly(): boolean;
		isUsed(): boolean;
		getUsedExports(): any;
		getProvidedExports(): true | Array<string>;
		isExportProvided(name: string | Array<string>): boolean;
		isExportUsed(name: string | Array<string>): 0 | 1 | 2 | 3 | 4;
		getUsedName(name: string | Array<string>): string | false | Array<string>;
		getRestoreProvidedData(): any;
		restoreProvided(__0: {
			otherProvided: any;
			otherCanMangleProvide: any;
			exports: any;
		}): void;
	}
	export interface ExportsSpec {
		/**
		 * exported names, true for unknown exports or null for no exports
		 */
		exports: true | Array<string | internals.ExportSpec>;

		/**
		 * can the export be renamed (defaults to true)
		 */
		canMangle?: boolean;

		/**
		 * module on which the result depends on
		 */
		dependencies?: Array<internals.Module>;
	}
	export type Expression =
		| UnaryExpression
		| ThisExpression
		| ArrayExpression
		| ObjectExpression
		| FunctionExpression
		| ArrowFunctionExpression
		| YieldExpression
		| SimpleLiteral
		| RegExpLiteral
		| UpdateExpression
		| BinaryExpression
		| AssignmentExpression
		| LogicalExpression
		| MemberExpression
		| ConditionalExpression
		| SimpleCallExpression
		| NewExpression
		| SequenceExpression
		| TemplateLiteral
		| TaggedTemplateExpression
		| ClassExpression
		| MetaProperty
		| Identifier
		| AwaitExpression;
	export type ExternalItem =
		| string
		| RegExp
		| {
				[index: string]:
					| string
					| boolean
					| Array<string>
					| { [index: string]: any };
		  }
		| ((
				context: string,
				request: string,
				callback: (err: Error, result: string) => void
		  ) => void);
	export type Externals =
		| string
		| RegExp
		| Array<
				| string
				| RegExp
				| {
						[index: string]:
							| string
							| boolean
							| Array<string>
							| { [index: string]: any };
				  }
				| ((
						context: string,
						request: string,
						callback: (err: Error, result: string) => void
				  ) => void)
		  >
		| {
				[index: string]:
					| string
					| boolean
					| Array<string>
					| { [index: string]: any };
		  }
		| ((
				context: string,
				request: string,
				callback: (err: Error, result: string) => void
		  ) => void);
	export class ExternalsPlugin {
		constructor(type?: any, externals?: any);
		type: any;
		externals: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type ExternalsType =
		| "var"
		| "module"
		| "assign"
		| "this"
		| "window"
		| "self"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "jsonp"
		| "system";
	export interface FactorizeModuleOptions {
		currentProfile: internals.ModuleProfile;
		factory: internals.ModuleFactory;
		dependencies: Array<internals.Dependency>;
		originModule: internals.Module;
		context?: string;
	}
	export interface FallbackCacheGroup {
		minSize: Record<string, number>;
		maxAsyncSize: Record<string, number>;
		maxInitialSize: Record<string, number>;
		automaticNameDelimiter: string;
	}
	export class FetchCompileWasmPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * Options object for persistent file-based caching.
	 */
	export interface FileCacheOptions {
		/**
		 * Dependencies the build depends on (in multiple categories, default categories: 'defaultWebpack').
		 */
		buildDependencies?: { [index: string]: Array<string> };

		/**
		 * Base directory for the cache (defaults to node_modules/.cache/webpack).
		 */
		cacheDirectory?: string;

		/**
		 * Locations for the cache (defaults to cacheDirectory / name).
		 */
		cacheLocation?: string;

		/**
		 * Algorithm used for generation the hash (see node.js crypto package).
		 */
		hashAlgorithm?: string;

		/**
		 * Time in ms after which idle period the cache storing should happen (only for store: 'pack' or 'idle').
		 */
		idleTimeout?: number;

		/**
		 * Time in ms after which idle period the initial cache storing should happen (only for store: 'pack' or 'idle').
		 */
		idleTimeoutForInitialStore?: number;

		/**
		 * List of paths that are managed by a package manager and contain a version or hash in it's path so all files are immutable.
		 */
		immutablePaths?: Array<string>;

		/**
		 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
		 */
		managedPaths?: Array<string>;

		/**
		 * Name for the cache. Different names will lead to different coexisting caches.
		 */
		name?: string;

		/**
		 * When to store data to the filesystem. (pack: Store data when compiler is idle in a single file).
		 */
		store?: "pack";

		/**
		 * Filesystem caching.
		 */
		type: "filesystem";

		/**
		 * Version of the cache data. Different versions won't allow to reuse the cache and override existing content. Update the version when config changed in a way which doesn't allow to reuse cache. This will invalidate the cache.
		 */
		version?: string;
	}
	export abstract class FileSystemInfo {
		fs: internals.InputFileSystem;
		logger: internals.WebpackLogger;
		fileTimestampQueue: internals.AsyncQueue<
			string,
			string,
			internals.FileSystemInfoEntry
		>;
		fileHashQueue: internals.AsyncQueue<string, string, string>;
		contextTimestampQueue: internals.AsyncQueue<
			string,
			string,
			internals.FileSystemInfoEntry
		>;
		contextHashQueue: internals.AsyncQueue<string, string, string>;
		managedItemQueue: internals.AsyncQueue<string, string, string>;
		managedItemDirectoryQueue: internals.AsyncQueue<
			string,
			string,
			Set<string>
		>;
		managedPaths: Array<string>;
		managedPathsWithSlash: Array<string>;
		immutablePaths: Array<string>;
		immutablePathsWithSlash: Array<string>;
		addFileTimestamps(
			map: Map<string, internals.FileSystemInfoEntry | "ignore">
		): void;
		addContextTimestamps(
			map: Map<string, internals.FileSystemInfoEntry | "ignore">
		): void;
		getFileTimestamp(
			path: string,
			callback: (
				arg0: internals.WebpackError,
				arg1: internals.FileSystemInfoEntry | "ignore"
			) => void
		): void;
		getContextTimestamp(
			path: string,
			callback: (
				arg0: internals.WebpackError,
				arg1: internals.FileSystemInfoEntry | "ignore"
			) => void
		): void;
		getFileHash(
			path: string,
			callback: (arg0: internals.WebpackError, arg1: string) => void
		): void;
		getContextHash(
			path: string,
			callback: (arg0: internals.WebpackError, arg1: string) => void
		): void;
		resolveBuildDependencies(
			context: string,
			deps: Iterable<string>,
			callback: (
				arg0: Error,
				arg1: internals.ResolveBuildDependenciesResult
			) => void
		): void;
		checkResolveResultsValid(
			resolveResults: Map<string, string>,
			callback: (arg0: Error, arg1: boolean) => void
		): void;
		createSnapshot(
			startTime: number,
			files: Iterable<string>,
			directories: Iterable<string>,
			missing: Iterable<string>,
			options: {
				/**
				 * should use hash to snapshot
				 */
				hash?: boolean;
			},
			callback: (arg0: internals.WebpackError, arg1: internals.Snapshot) => void
		): void;
		mergeSnapshots(
			snapshot1: internals.Snapshot,
			snapshot2: internals.Snapshot
		): internals.Snapshot;
		checkSnapshotValid(
			snapshot: internals.Snapshot,
			callback: (arg0: internals.WebpackError, arg1: boolean) => void
		): void;
		getDeprecatedFileTimestamps(): Map<any, any>;
		getDeprecatedContextTimestamps(): Map<any, any>;
	}

	/**
	 * istanbul ignore next
	 */
	export interface FileSystemInfoEntry {
		safeTime: number;
		timestamp?: number;
		timestampHash?: string;
	}
	export type Filename =
		| string
		| ((
				pathData: internals.PathData,
				assetInfo: internals.AssetInfo
		  ) => string);
	export type FilterItemTypes = string | RegExp | ((value: string) => boolean);
	export type FilterTypes =
		| string
		| RegExp
		| Array<string | RegExp | ((value: string) => boolean)>
		| ((value: string) => boolean);
	export interface GenerateContext {
		/**
		 * mapping from dependencies to templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;

		/**
		 * the requirements for runtime
		 */
		runtimeRequirements: Set<string>;

		/**
		 * which kind of code should be generated
		 */
		type: string;
	}
	export class Generator {
		constructor();
		getTypes(module: internals.NormalModule): Set<string>;
		getSize(module: internals.NormalModule, type: string): number;
		generate(
			module: internals.NormalModule,
			__1: internals.GenerateContext
		): internals.Source;
		updateHash(hash: internals.Hash, __1: internals.UpdateHashContext): void;
		static byType(map?: any): internals.ByTypeGenerator;
	}
	export interface HMRJavascriptParserHooks {
		hotAcceptCallback: SyncBailHook<[any, Array<string>], void>;
		hotAcceptWithoutCallback: SyncBailHook<[any, Array<string>], void>;
	}
	export interface HandleModuleCreationOptions {
		factory: internals.ModuleFactory;
		dependencies: Array<internals.Dependency>;
		originModule: internals.Module;
		context?: string;

		/**
		 * recurse into dependencies of the created module
		 */
		recursive?: boolean;
	}
	export class Hash {
		constructor();
		update(data: string | Buffer, inputEncoding: string): internals.Hash;
		digest(encoding: string): string | Buffer;
	}
	export type HashFunction = string | typeof internals.Hash;
	export class HashedModuleIdsPlugin {
		constructor(options?: internals.HashedModuleIdsPluginOptions);
		options: internals.HashedModuleIdsPluginOptions;
		apply(compiler?: any): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface HashedModuleIdsPluginOptions {
		/**
		 * The context directory for creating names.
		 */
		context?: string;

		/**
		 * The encoding to use when generating the hash, defaults to 'base64'. All encodings from Node.JS' hash.digest are supported.
		 */
		hashDigest?: "hex" | "latin1" | "base64";

		/**
		 * The prefix length of the hash digest to use, defaults to 4.
		 */
		hashDigestLength?: number;

		/**
		 * The hashing algorithm to use, defaults to 'md4'. All functions from Node.JS' crypto.createHash are supported.
		 */
		hashFunction?: string;
	}
	export class HotModuleReplacementPlugin {
		constructor(options?: any);
		options: any;
		multiStep: any;
		fullBuildTimeout: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static getParserHooks(
			parser: internals.JavascriptParser
		): internals.HMRJavascriptParserHooks;
	}
	export class IgnorePlugin {
		constructor(
			options:
				| {
						/**
						 * A RegExp to test the context (directory) against.
						 */
						contextRegExp?: RegExp;
						/**
						 * A RegExp to test the request against.
						 */
						resourceRegExp?: RegExp;
				  }
				| {
						/**
						 * A filter function for resource and context.
						 */
						checkResource?: (resource: string, context: string) => boolean;
				  }
		);
		options:
			| {
					/**
					 * A RegExp to test the context (directory) against.
					 */
					contextRegExp?: RegExp;
					/**
					 * A RegExp to test the request against.
					 */
					resourceRegExp?: RegExp;
			  }
			| {
					/**
					 * A filter function for resource and context.
					 */
					checkResource?: (resource: string, context: string) => boolean;
			  };

		/**
		 * Note that if "contextRegExp" is given, both the "resourceRegExp"
		 * and "contextRegExp" have to match.
		 */
		checkIgnore(resolveData: internals.ResolveData): false;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type IgnorePluginOptions =
		| {
				/**
				 * A RegExp to test the context (directory) against.
				 */
				contextRegExp?: RegExp;
				/**
				 * A RegExp to test the request against.
				 */
				resourceRegExp?: RegExp;
		  }
		| {
				/**
				 * A filter function for resource and context.
				 */
				checkResource?: (resource: string, context: string) => boolean;
		  };

	/**
	 * Options for infrastructure level logging.
	 */
	export interface InfrastructureLogging {
		/**
		 * Enable debug logging for specific loggers.
		 */
		debug?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Log level.
		 */
		level?: "none" | "verbose" | "error" | "warn" | "info" | "log";
	}
	export abstract class InitFragment {
		content: string | internals.Source;
		stage: number;
		position: number;
		key: string;
		endContent: string | internals.Source;
		getContent(
			generateContext: internals.GenerateContext
		): string | internals.Source;
		getEndContent(
			generateContext: internals.GenerateContext
		): string | internals.Source;
		merge: any;
	}
	export interface InputFileSystem {
		readFile: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: Buffer) => void
		) => void;
		readdir: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: Array<string>) => void
		) => void;
		stat: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: FsStats) => void
		) => void;
		realpath?: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: string) => void
		) => void;
		purge?: (arg0: string) => void;
		join?: (arg0: string, arg1: string) => string;
		relative?: (arg0: string, arg1: string) => string;
		dirname?: (arg0: string) => string;
	}
	export interface IntermediateFileSystemExtras {
		mkdirSync: (arg0: string) => void;
		createWriteStream: (arg0: string) => WriteStream;
		rename: (
			arg0: string,
			arg1: string,
			arg2: (arg0: NodeJS.ErrnoException) => void
		) => void;
	}
	export class JavascriptModulesPlugin {
		constructor(options?: {});
		options: {};

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		renderModule(
			module: internals.Module,
			renderContext: internals.RenderContextJavascriptModulesPlugin,
			hooks: internals.CompilationHooksJavascriptModulesPlugin,
			factory: boolean | "strict"
		): internals.Source;
		renderChunk(
			renderContext: internals.RenderContextJavascriptModulesPlugin,
			hooks: internals.CompilationHooksJavascriptModulesPlugin
		): internals.Source;
		renderMain(
			renderContext: internals.MainRenderContext,
			hooks: internals.CompilationHooksJavascriptModulesPlugin
		): internals.Source;
		renderBootstrap(
			renderContext: internals.RenderBootstrapContext,
			hooks: internals.CompilationHooksJavascriptModulesPlugin
		): {
			header: Array<string>;
			startup: Array<string>;
			allowInlineStartup: boolean;
		};
		renderRequire(
			renderContext: internals.RenderBootstrapContext,
			hooks: internals.CompilationHooksJavascriptModulesPlugin
		): string;
		static getCompilationHooks(
			compilation: internals.Compilation
		): internals.CompilationHooksJavascriptModulesPlugin;
		static getChunkFilenameTemplate(chunk?: any, outputOptions?: any): any;
		static chunkHasJs: (
			chunk: internals.Chunk,
			chunkGraph: internals.ChunkGraph
		) => boolean;
	}
	export abstract class JavascriptParser extends internals.Parser {
		hooks: Readonly<{
			evaluateTypeof: HookMap<
				SyncBailHook<[UnaryExpression], internals.BasicEvaluatedExpression>
			>;
			evaluate: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					internals.BasicEvaluatedExpression
				>
			>;
			evaluateIdentifier: HookMap<
				SyncBailHook<
					[ThisExpression | MemberExpression | Identifier],
					internals.BasicEvaluatedExpression
				>
			>;
			evaluateDefinedIdentifier: HookMap<
				SyncBailHook<
					[ThisExpression | MemberExpression | Identifier],
					internals.BasicEvaluatedExpression
				>
			>;
			evaluateCallExpressionMember: HookMap<
				SyncBailHook<
					[
						SimpleCallExpression | NewExpression,
						internals.BasicEvaluatedExpression
					],
					internals.BasicEvaluatedExpression
				>
			>;
			preStatement: SyncBailHook<
				[
					| ExpressionStatement
					| BlockStatement
					| EmptyStatement
					| DebuggerStatement
					| WithStatement
					| ReturnStatement
					| LabeledStatement
					| BreakStatement
					| ContinueStatement
					| IfStatement
					| SwitchStatement
					| ThrowStatement
					| TryStatement
					| WhileStatement
					| DoWhileStatement
					| ForStatement
					| ForInStatement
					| ForOfStatement
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
					| ImportDeclaration
					| ExportNamedDeclaration
					| ExportDefaultDeclaration
					| ExportAllDeclaration
				],
				boolean | void
			>;
			blockPreStatement: SyncBailHook<
				[
					| ExpressionStatement
					| BlockStatement
					| EmptyStatement
					| DebuggerStatement
					| WithStatement
					| ReturnStatement
					| LabeledStatement
					| BreakStatement
					| ContinueStatement
					| IfStatement
					| SwitchStatement
					| ThrowStatement
					| TryStatement
					| WhileStatement
					| DoWhileStatement
					| ForStatement
					| ForInStatement
					| ForOfStatement
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
					| ImportDeclaration
					| ExportNamedDeclaration
					| ExportDefaultDeclaration
					| ExportAllDeclaration
				],
				boolean | void
			>;
			statement: SyncBailHook<
				[
					| ExpressionStatement
					| BlockStatement
					| EmptyStatement
					| DebuggerStatement
					| WithStatement
					| ReturnStatement
					| LabeledStatement
					| BreakStatement
					| ContinueStatement
					| IfStatement
					| SwitchStatement
					| ThrowStatement
					| TryStatement
					| WhileStatement
					| DoWhileStatement
					| ForStatement
					| ForInStatement
					| ForOfStatement
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
					| ImportDeclaration
					| ExportNamedDeclaration
					| ExportDefaultDeclaration
					| ExportAllDeclaration
				],
				boolean | void
			>;
			statementIf: SyncBailHook<[IfStatement], boolean | void>;
			classExtendsExpression: SyncBailHook<
				[
					(
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					),
					ClassExpression | ClassDeclaration
				],
				boolean | void
			>;
			classBodyElement: SyncBailHook<
				[MethodDefinition, ClassExpression | ClassDeclaration],
				boolean | void
			>;
			label: HookMap<SyncBailHook<[LabeledStatement], boolean | void>>;
			import: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral
				],
				boolean | void
			>;
			importSpecifier: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral,
					string,
					string
				],
				boolean | void
			>;
			export: SyncBailHook<
				[
					| ExpressionStatement
					| BlockStatement
					| EmptyStatement
					| DebuggerStatement
					| WithStatement
					| ReturnStatement
					| LabeledStatement
					| BreakStatement
					| ContinueStatement
					| IfStatement
					| SwitchStatement
					| ThrowStatement
					| TryStatement
					| WhileStatement
					| DoWhileStatement
					| ForStatement
					| ForInStatement
					| ForOfStatement
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
				],
				boolean | void
			>;
			exportImport: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral
				],
				boolean | void
			>;
			exportDeclaration: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					FunctionDeclaration | VariableDeclaration | ClassDeclaration
				],
				boolean | void
			>;
			exportExpression: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					FunctionDeclaration | VariableDeclaration | ClassDeclaration
				],
				boolean | void
			>;
			exportSpecifier: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string,
					string,
					number
				],
				boolean | void
			>;
			exportImportSpecifier: SyncBailHook<
				[
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral,
					string,
					string,
					number
				],
				boolean | void
			>;
			preDeclarator: SyncBailHook<
				[
					VariableDeclarator,
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					)
				],
				boolean | void
			>;
			declarator: SyncBailHook<
				[
					VariableDeclarator,
					(
						| ExpressionStatement
						| BlockStatement
						| EmptyStatement
						| DebuggerStatement
						| WithStatement
						| ReturnStatement
						| LabeledStatement
						| BreakStatement
						| ContinueStatement
						| IfStatement
						| SwitchStatement
						| ThrowStatement
						| TryStatement
						| WhileStatement
						| DoWhileStatement
						| ForStatement
						| ForInStatement
						| ForOfStatement
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					)
				],
				boolean | void
			>;
			varDeclaration: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			varDeclarationLet: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			varDeclarationConst: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			varDeclarationVar: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			pattern: HookMap<SyncBailHook<any, any>>;
			canRename: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					boolean | void
				>
			>;
			rename: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					boolean | void
				>
			>;
			assign: HookMap<SyncBailHook<[AssignmentExpression], boolean | void>>;
			assignMemberChain: HookMap<
				SyncBailHook<[AssignmentExpression, Array<string>], boolean | void>
			>;
			typeof: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					boolean | void
				>
			>;
			importCall: SyncBailHook<
				[
					| UnaryExpression
					| ThisExpression
					| ArrayExpression
					| ObjectExpression
					| FunctionExpression
					| ArrowFunctionExpression
					| YieldExpression
					| SimpleLiteral
					| RegExpLiteral
					| UpdateExpression
					| BinaryExpression
					| AssignmentExpression
					| LogicalExpression
					| MemberExpression
					| ConditionalExpression
					| SimpleCallExpression
					| NewExpression
					| SequenceExpression
					| TemplateLiteral
					| TaggedTemplateExpression
					| ClassExpression
					| MetaProperty
					| Identifier
					| AwaitExpression
				],
				boolean | void
			>;
			topLevelAwait: SyncBailHook<
				[
					| UnaryExpression
					| ThisExpression
					| ArrayExpression
					| ObjectExpression
					| FunctionExpression
					| ArrowFunctionExpression
					| YieldExpression
					| SimpleLiteral
					| RegExpLiteral
					| UpdateExpression
					| BinaryExpression
					| AssignmentExpression
					| LogicalExpression
					| MemberExpression
					| ConditionalExpression
					| SimpleCallExpression
					| NewExpression
					| SequenceExpression
					| TemplateLiteral
					| TaggedTemplateExpression
					| ClassExpression
					| MetaProperty
					| Identifier
					| AwaitExpression
				],
				boolean | void
			>;
			call: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					boolean | void
				>
			>;
			callMemberChain: HookMap<
				SyncBailHook<
					[
						(
							| UnaryExpression
							| ThisExpression
							| ArrayExpression
							| ObjectExpression
							| FunctionExpression
							| ArrowFunctionExpression
							| YieldExpression
							| SimpleLiteral
							| RegExpLiteral
							| UpdateExpression
							| BinaryExpression
							| AssignmentExpression
							| LogicalExpression
							| MemberExpression
							| ConditionalExpression
							| SimpleCallExpression
							| NewExpression
							| SequenceExpression
							| TemplateLiteral
							| TaggedTemplateExpression
							| ClassExpression
							| MetaProperty
							| Identifier
							| AwaitExpression
						),
						Array<string>
					],
					boolean | void
				>
			>;
			memberChainOfCallMemberChain: HookMap<
				SyncBailHook<
					[
						(
							| UnaryExpression
							| ThisExpression
							| ArrayExpression
							| ObjectExpression
							| FunctionExpression
							| ArrowFunctionExpression
							| YieldExpression
							| SimpleLiteral
							| RegExpLiteral
							| UpdateExpression
							| BinaryExpression
							| AssignmentExpression
							| LogicalExpression
							| MemberExpression
							| ConditionalExpression
							| SimpleCallExpression
							| NewExpression
							| SequenceExpression
							| TemplateLiteral
							| TaggedTemplateExpression
							| ClassExpression
							| MetaProperty
							| Identifier
							| AwaitExpression
						),
						Array<string>,
						SimpleCallExpression | NewExpression,
						Array<string>
					],
					boolean | void
				>
			>;
			callMemberChainOfCallMemberChain: HookMap<
				SyncBailHook<
					[
						(
							| UnaryExpression
							| ThisExpression
							| ArrayExpression
							| ObjectExpression
							| FunctionExpression
							| ArrowFunctionExpression
							| YieldExpression
							| SimpleLiteral
							| RegExpLiteral
							| UpdateExpression
							| BinaryExpression
							| AssignmentExpression
							| LogicalExpression
							| MemberExpression
							| ConditionalExpression
							| SimpleCallExpression
							| NewExpression
							| SequenceExpression
							| TemplateLiteral
							| TaggedTemplateExpression
							| ClassExpression
							| MetaProperty
							| Identifier
							| AwaitExpression
						),
						Array<string>,
						SimpleCallExpression | NewExpression,
						Array<string>
					],
					boolean | void
				>
			>;
			new: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					boolean | void
				>
			>;
			expression: HookMap<
				SyncBailHook<
					[
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
					],
					boolean | void
				>
			>;
			expressionMemberChain: HookMap<
				SyncBailHook<
					[
						(
							| UnaryExpression
							| ThisExpression
							| ArrayExpression
							| ObjectExpression
							| FunctionExpression
							| ArrowFunctionExpression
							| YieldExpression
							| SimpleLiteral
							| RegExpLiteral
							| UpdateExpression
							| BinaryExpression
							| AssignmentExpression
							| LogicalExpression
							| MemberExpression
							| ConditionalExpression
							| SimpleCallExpression
							| NewExpression
							| SequenceExpression
							| TemplateLiteral
							| TaggedTemplateExpression
							| ClassExpression
							| MetaProperty
							| Identifier
							| AwaitExpression
						),
						Array<string>
					],
					boolean | void
				>
			>;
			expressionConditionalOperator: SyncBailHook<
				[
					| UnaryExpression
					| ThisExpression
					| ArrayExpression
					| ObjectExpression
					| FunctionExpression
					| ArrowFunctionExpression
					| YieldExpression
					| SimpleLiteral
					| RegExpLiteral
					| UpdateExpression
					| BinaryExpression
					| AssignmentExpression
					| LogicalExpression
					| MemberExpression
					| ConditionalExpression
					| SimpleCallExpression
					| NewExpression
					| SequenceExpression
					| TemplateLiteral
					| TaggedTemplateExpression
					| ClassExpression
					| MetaProperty
					| Identifier
					| AwaitExpression
				],
				boolean | void
			>;
			expressionLogicalOperator: SyncBailHook<
				[
					| UnaryExpression
					| ThisExpression
					| ArrayExpression
					| ObjectExpression
					| FunctionExpression
					| ArrowFunctionExpression
					| YieldExpression
					| SimpleLiteral
					| RegExpLiteral
					| UpdateExpression
					| BinaryExpression
					| AssignmentExpression
					| LogicalExpression
					| MemberExpression
					| ConditionalExpression
					| SimpleCallExpression
					| NewExpression
					| SequenceExpression
					| TemplateLiteral
					| TaggedTemplateExpression
					| ClassExpression
					| MetaProperty
					| Identifier
					| AwaitExpression
				],
				boolean | void
			>;
			program: SyncBailHook<[Program, Array<Comment>], boolean | void>;
			finish: SyncBailHook<[Program, Array<Comment>], boolean | void>;
		}>;
		options: any;
		sourceType: "module" | "script" | "auto";
		scope: internals.ScopeInfo;
		state: Record<string, any> & internals.ParserStateBase;
		comments: any;
		semicolons: any;
		statementEndPos: any;
		lastStatementEndPos: any;
		statementStartPos: any;
		currentTagData: any;
		initializeEvaluating(): void;
		getRenameIdentifier(expr?: any): any;
		walkClass(classy: ClassExpression | ClassDeclaration): void;
		walkMethodDefinition(methodDefinition?: any): void;
		preWalkStatements(statements?: any): void;
		blockPreWalkStatements(statements?: any): void;
		walkStatements(statements?: any): void;
		preWalkStatement(statement?: any): void;
		blockPreWalkStatement(statement?: any): void;
		walkStatement(statement?: any): void;
		preWalkBlockStatement(statement?: any): void;
		walkBlockStatement(statement?: any): void;
		walkExpressionStatement(statement?: any): void;
		preWalkIfStatement(statement?: any): void;
		walkIfStatement(statement?: any): void;
		preWalkLabeledStatement(statement?: any): void;
		walkLabeledStatement(statement?: any): void;
		preWalkWithStatement(statement?: any): void;
		walkWithStatement(statement?: any): void;
		preWalkSwitchStatement(statement?: any): void;
		walkSwitchStatement(statement?: any): void;
		walkTerminatingStatement(statement?: any): void;
		walkReturnStatement(statement?: any): void;
		walkThrowStatement(statement?: any): void;
		preWalkTryStatement(statement?: any): void;
		walkTryStatement(statement?: any): void;
		preWalkWhileStatement(statement?: any): void;
		walkWhileStatement(statement?: any): void;
		preWalkDoWhileStatement(statement?: any): void;
		walkDoWhileStatement(statement?: any): void;
		preWalkForStatement(statement?: any): void;
		walkForStatement(statement?: any): void;
		preWalkForInStatement(statement?: any): void;
		walkForInStatement(statement?: any): void;
		preWalkForOfStatement(statement?: any): void;
		walkForOfStatement(statement?: any): void;
		preWalkFunctionDeclaration(statement?: any): void;
		walkFunctionDeclaration(statement?: any): void;
		blockPreWalkImportDeclaration(statement?: any): void;
		enterDeclaration(declaration?: any, onIdent?: any): void;
		blockPreWalkExportNamedDeclaration(statement?: any): void;
		walkExportNamedDeclaration(statement?: any): void;
		blockPreWalkExportDefaultDeclaration(statement?: any): void;
		walkExportDefaultDeclaration(statement?: any): void;
		blockPreWalkExportAllDeclaration(statement?: any): void;
		preWalkVariableDeclaration(statement?: any): void;
		blockPreWalkVariableDeclaration(statement?: any): void;
		walkVariableDeclaration(statement?: any): void;
		blockPreWalkClassDeclaration(statement?: any): void;
		walkClassDeclaration(statement?: any): void;
		preWalkSwitchCases(switchCases?: any): void;
		walkSwitchCases(switchCases?: any): void;
		preWalkCatchClause(catchClause?: any): void;
		walkCatchClause(catchClause?: any): void;
		walkPattern(pattern?: any): void;
		walkAssignmentPattern(pattern?: any): void;
		walkObjectPattern(pattern?: any): void;
		walkArrayPattern(pattern?: any): void;
		walkRestElement(pattern?: any): void;
		walkExpressions(expressions?: any): void;
		walkExpression(expression?: any): void;
		walkAwaitExpression(expression?: any): void;
		walkArrayExpression(expression?: any): void;
		walkSpreadElement(expression?: any): void;
		walkObjectExpression(expression?: any): void;
		walkFunctionExpression(expression?: any): void;
		walkArrowFunctionExpression(expression?: any): void;
		walkSequenceExpression(expression?: any): void;
		walkUpdateExpression(expression?: any): void;
		walkUnaryExpression(expression?: any): void;
		walkLeftRightExpression(expression?: any): void;
		walkBinaryExpression(expression?: any): void;
		walkLogicalExpression(expression?: any): void;
		walkAssignmentExpression(expression?: any): void;
		walkConditionalExpression(expression?: any): void;
		walkNewExpression(expression?: any, args?: any): void;
		walkYieldExpression(expression?: any): void;
		walkTemplateLiteral(expression?: any): void;
		walkTaggedTemplateExpression(expression?: any): void;
		walkClassExpression(expression?: any): void;
		walkImportExpression(expression?: any): void;
		walkCallExpression(expression?: any, args?: any): void;
		walkMemberExpression(expression?: any): void;
		walkMemberExpressionWithExpressionName(
			expression?: any,
			name?: any,
			rootInfo?: any,
			members?: any
		): void;
		walkThisExpression(expression?: any): void;
		walkIdentifier(expression?: any): void;
		callHooksForExpression(hookMap: any, expr: any, ...args: Array<any>): any;
		callHooksForExpressionWithFallback<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			expr: MemberExpression,
			fallback: (
				arg0: string,
				arg1: string | internals.ScopeInfo | internals.VariableInfo,
				arg2: () => Array<string>
			) => any,
			defined: (arg0: string) => any,
			...args: AsArray<T>
		): R;
		callHooksForName<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			name: string,
			...args: AsArray<T>
		): R;
		callHooksForInfo<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			info: string | internals.ScopeInfo | internals.VariableInfo,
			...args: AsArray<T>
		): R;
		callHooksForInfoWithFallback<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			info: string | internals.ScopeInfo | internals.VariableInfo,
			fallback: (arg0: string) => any,
			defined: () => any,
			...args: AsArray<T>
		): R;
		callHooksForNameWithFallback<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			name: string,
			fallback: (arg0: string) => any,
			defined: () => any,
			...args: AsArray<T>
		): R;
		inScope(params: any, fn: () => void): void;
		inFunctionScope(hasThis?: any, params?: any, fn?: any): void;
		inBlockScope(fn?: any): void;
		detectMode(statements?: any): void;
		enterPatterns(patterns?: any, onIdent?: any): void;
		enterPattern(pattern?: any, onIdent?: any): void;
		enterIdentifier(pattern?: any, onIdent?: any): void;
		enterObjectPattern(pattern?: any, onIdent?: any): void;
		enterArrayPattern(pattern?: any, onIdent?: any): void;
		enterRestElement(pattern?: any, onIdent?: any): void;
		enterAssignmentPattern(pattern?: any, onIdent?: any): void;
		evaluateExpression(
			expression:
				| UnaryExpression
				| ThisExpression
				| ArrayExpression
				| ObjectExpression
				| FunctionExpression
				| ArrowFunctionExpression
				| YieldExpression
				| SimpleLiteral
				| RegExpLiteral
				| UpdateExpression
				| BinaryExpression
				| AssignmentExpression
				| LogicalExpression
				| MemberExpression
				| ConditionalExpression
				| SimpleCallExpression
				| NewExpression
				| SequenceExpression
				| TemplateLiteral
				| TaggedTemplateExpression
				| ClassExpression
				| MetaProperty
				| Identifier
				| AwaitExpression
		): internals.BasicEvaluatedExpression;
		parseString(expression?: any): any;
		parseCalculatedString(expression?: any): any;
		evaluate(source?: any): internals.BasicEvaluatedExpression;
		getComments(range?: any): any;
		isAsiPosition(pos?: any): any;
		getTagData(name?: any, tag?: any): any;
		tagVariable(name?: any, tag?: any, data?: any): void;
		defineVariable(name?: any): void;
		undefineVariable(name?: any): void;
		isVariableDefined(name?: any): boolean;
		getVariableInfo(
			name: string
		): string | internals.ScopeInfo | internals.VariableInfo;
		setVariable(
			name: string,
			variableInfo: string | internals.ScopeInfo | internals.VariableInfo
		): void;
		parseCommentOptions(range?: any): { options: any; errors: any };
		extractMemberExpressionChain(
			expression: MemberExpression
		): {
			members: Array<string>;
			object:
				| UnaryExpression
				| ThisExpression
				| ArrayExpression
				| ObjectExpression
				| FunctionExpression
				| ArrowFunctionExpression
				| YieldExpression
				| SimpleLiteral
				| RegExpLiteral
				| UpdateExpression
				| BinaryExpression
				| AssignmentExpression
				| LogicalExpression
				| MemberExpression
				| ConditionalExpression
				| SimpleCallExpression
				| NewExpression
				| SequenceExpression
				| TemplateLiteral
				| TaggedTemplateExpression
				| ClassExpression
				| MetaProperty
				| Identifier
				| AwaitExpression
				| Super;
		};
		getFreeInfoFromVariable(
			varName: string
		): { name: string; info: string | internals.VariableInfo };
		getMemberExpressionInfo(
			expression: MemberExpression,
			allowedTypes: Array<"expression" | "call">
		):
			| {
					type: "call";
					call: SimpleCallExpression | NewExpression;
					calleeName: string;
					rootInfo: string | internals.VariableInfo;
					getCalleeMembers: () => Array<string>;
					name: string;
					getMembers: () => Array<string>;
			  }
			| {
					type: "expression";
					rootInfo: string | internals.VariableInfo;
					name: string;
					getMembers: () => Array<string>;
			  };
		getNameForExpression(
			expression: MemberExpression
		): {
			name: string;
			rootInfo: string | internals.ScopeInfo | internals.VariableInfo;
			getMembers: () => Array<string>;
		};
	}
	export interface JsonpCompilationPluginHooks {
		jsonpScript: SyncWaterfallHook<[string, internals.Chunk, string]>;
		linkPreload: SyncWaterfallHook<[string, internals.Chunk, string]>;
		linkPrefetch: SyncWaterfallHook<[string, internals.Chunk, string]>;
	}
	export type JsonpScriptType = false | "module" | "text/javascript";
	export class JsonpTemplatePlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static getCompilationHooks(
			compilation: internals.Compilation
		): internals.JsonpCompilationPluginHooks;
	}
	export interface KnownBuildMeta {
		moduleArgument?: string;
		exportsArgument?: string;
		strict?: boolean;
		moduleConcatenationBailout?: string;
		exportsType?: "default" | "namespace" | "flagged";
		defaultObject?: boolean | "redirect" | "redirect-warn";
		strictHarmonyModule?: boolean;
		async?: boolean;
	}
	export abstract class LazySet<T> {
		readonly size: number;
		add(item: T): internals.LazySet<T>;
		addAll(iterable: internals.LazySet<T> | Iterable<T>): internals.LazySet<T>;
		clear(): void;
		delete(value: T): boolean;
		entries(): IterableIterator<[T, T]>;
		forEach(
			callbackFn: (arg0: T, arg1: T, arg2: Set<T>) => void,
			thisArg?: any
		): void;
		has(item: T): boolean;
		keys(): IterableIterator<T>;
		values(): IterableIterator<T>;
		serialize(__0: { write: any }): void;
	}
	export interface LibIdentOptions {
		/**
		 * absolute context path to which lib ident is relative to
		 */
		context: string;

		/**
		 * object for caching
		 */
		associatedObjectForCache?: any;
	}
	export class LibManifestPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type Library =
		| string
		| Array<string>
		| internals.LibraryCustomUmdObject
		| internals.LibraryOptions;
	export interface LibraryContext<T> {
		compilation: internals.Compilation;
		options: T;
	}

	/**
	 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
	 */
	export interface LibraryCustomUmdCommentObject {
		/**
		 * Set comment for `amd` section in UMD.
		 */
		amd?: string;

		/**
		 * Set comment for `commonjs` (exports) section in UMD.
		 */
		commonjs?: string;

		/**
		 * Set comment for `commonjs2` (module.exports) section in UMD.
		 */
		commonjs2?: string;

		/**
		 * Set comment for `root` (global variable) section in UMD.
		 */
		root?: string;
	}

	/**
	 * Description object for all UMD variants of the library name.
	 */
	export interface LibraryCustomUmdObject {
		/**
		 * Name of the exposed AMD library in the UMD.
		 */
		amd?: string;

		/**
		 * Name of the exposed commonjs export in the UMD.
		 */
		commonjs?: string;

		/**
		 * Name of the property exposed globally by a UMD library.
		 */
		root?: string | Array<string>;
	}
	export type LibraryExport = string | Array<string>;
	export type LibraryName =
		| string
		| Array<string>
		| internals.LibraryCustomUmdObject;

	/**
	 * Options for library.
	 */
	export interface LibraryOptions {
		/**
		 * Add a comment in the UMD wrapper.
		 */
		auxiliaryComment?: string | internals.LibraryCustomUmdCommentObject;

		/**
		 * Specify which export should be exposed as library.
		 */
		export?: string | Array<string>;

		/**
		 * The name of the library (some types allow unnamed libraries too).
		 */
		name?: string | Array<string> | internals.LibraryCustomUmdObject;

		/**
		 * Type of library.
		 */
		type:
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system";

		/**
		 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
		 */
		umdNamedDefine?: boolean;
	}
	export class LibraryTemplatePlugin {
		constructor(
			name: string | Array<string> | internals.LibraryCustomUmdObject,
			target:
				| "var"
				| "module"
				| "assign"
				| "this"
				| "window"
				| "self"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system",
			umdNamedDefine: boolean,
			auxiliaryComment: string | internals.LibraryCustomUmdCommentObject,
			exportProperty: string | Array<string>
		);
		library: {
			type:
				| "var"
				| "module"
				| "assign"
				| "this"
				| "window"
				| "self"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system";
			name: string | Array<string> | internals.LibraryCustomUmdObject;
			umdNamedDefine: boolean;
			auxiliaryComment: string | internals.LibraryCustomUmdCommentObject;
			export: string | Array<string>;
		};

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class LimitChunkCountPlugin {
		constructor(options: internals.LimitChunkCountPluginOptions);
		options: internals.LimitChunkCountPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface LimitChunkCountPluginOptions {
		/**
		 * Constant overhead for a chunk.
		 */
		chunkOverhead?: number;

		/**
		 * Multiplicator for initial chunks.
		 */
		entryChunkMultiplicator?: number;

		/**
		 * Limit the maximum number of chunks using a value greater greater than or equal to 1.
		 */
		maxChunks: number;
	}

	/**
	 * Custom values available in the loader context.
	 */
	export interface Loader {
		[index: string]: any;
	}
	export interface LoaderItem {
		loader: string;
		options: any;
		ident: string;
	}
	export class LoaderOptionsPlugin {
		constructor(options?: internals.LoaderOptionsPluginOptions);
		options: internals.LoaderOptionsPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface LoaderOptionsPluginOptions {
		[index: string]: any;

		/**
		 * Whether loaders should be in debug mode or not. debug will be removed as of webpack 3.
		 */
		debug?: boolean;

		/**
		 * Where loaders can be switched to minimize mode.
		 */
		minimize?: boolean;

		/**
		 * A configuration object that can be used to configure older loaders.
		 */
		options?: {
			[index: string]: any;
			/**
			 * The context that can be used to configure older loaders.
			 */
			context?: string;
		};
	}
	export class LoaderTargetPlugin {
		constructor(target: string);
		target: string;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface LogEntry {
		type: string;
		args: Array<any>;
		time: number;
		trace?: Array<string>;
	}
	export const MEASURE_END_OPERATION: unique symbol;
	export const MEASURE_START_OPERATION: unique symbol;
	export interface MainRenderContext {
		/**
		 * the chunk
		 */
		chunk: internals.Chunk;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;

		/**
		 * results of code generation
		 */
		codeGenerationResults: Map<
			internals.Module,
			internals.CodeGenerationResult
		>;

		/**
		 * hash to be used for render call
		 */
		hash: string;
	}
	export abstract class MainTemplate {
		hooks: Readonly<{
			renderManifest: { tap: (options?: any, fn?: any) => void };
			modules: { tap: () => never };
			moduleObj: { tap: () => never };
			require: { tap: (options?: any, fn?: any) => void };
			beforeStartup: { tap: () => never };
			startup: { tap: () => never };
			afterStartup: { tap: () => never };
			render: { tap: (options?: any, fn?: any) => void };
			renderWithEntry: { tap: (options?: any, fn?: any) => void };
			assetPath: {
				tap: (options?: any, fn?: any) => void;
				call: (filename?: any, options?: any) => string;
			};
			hash: { tap: (options?: any, fn?: any) => void };
			hashForChunk: { tap: (options?: any, fn?: any) => void };
			globalHashPaths: { tap: () => void };
			globalHash: { tap: () => void };
			hotBootstrap: { tap: () => never };
			bootstrap: SyncWaterfallHook<
				[
					string,
					internals.Chunk,
					string,
					internals.ModuleTemplate,
					internals.DependencyTemplates
				]
			>;
			localVars: SyncWaterfallHook<[string, internals.Chunk, string]>;
			requireExtensions: SyncWaterfallHook<[string, internals.Chunk, string]>;
			requireEnsure: SyncWaterfallHook<
				[string, internals.Chunk, string, string]
			>;
		}>;
		renderCurrentHashCode: (hash: string, length: number) => string;
		getPublicPath: (options?: any) => string;
		getAssetPath: (path?: any, options?: any) => string;
		getAssetPathWithInfo: (
			path?: any,
			options?: any
		) => { path: string; info: internals.AssetInfo };
		readonly requireFn: string;
		readonly outputOptions: any;
	}
	export interface MapOptions {
		columns?: boolean;
		module?: boolean;
	}

	/**
	 * Options object for in-memory caching.
	 */
	export interface MemoryCacheOptions {
		/**
		 * List of paths that are managed by a package manager and contain a version or hash in it's path so all files are immutable.
		 */
		immutablePaths?: Array<string>;

		/**
		 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
		 */
		managedPaths?: Array<string>;

		/**
		 * In memory caching.
		 */
		type: "memory";
	}
	export class MemoryCachePlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class MinChunkSizePlugin {
		constructor(options: internals.MinChunkSizePluginOptions);
		options: internals.MinChunkSizePluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface MinChunkSizePluginOptions {
		/**
		 * Constant overhead for a chunk.
		 */
		chunkOverhead?: number;

		/**
		 * Multiplicator for initial chunks.
		 */
		entryChunkMultiplicator?: number;

		/**
		 * Minimum number of characters.
		 */
		minChunkSize: number;
	}
	export type Mode = "development" | "production" | "none";
	export class Module extends internals.DependenciesBlock {
		constructor(type: string, context?: string);
		type: string;
		context: string;
		needId: boolean;
		debugId: number;
		resolveOptions: any;
		factoryMeta: any;
		buildMeta: internals.KnownBuildMeta & Record<string, any>;
		buildInfo: any;
		presentationalDependencies: Array<internals.Dependency>;
		id: string | number;
		readonly hash: string;
		readonly renderedHash: string;
		profile: internals.ModuleProfile;
		index: number;
		index2: number;
		depth: number;
		issuer: internals.Module;
		readonly usedExports: boolean | internals.SortableSet<string>;
		readonly optimizationBailout: Array<
			string | ((requestShortener: internals.RequestShortener) => string)
		>;
		readonly optional: boolean;
		addChunk(chunk?: any): boolean;
		removeChunk(chunk?: any): void;
		isInChunk(chunk?: any): boolean;
		isEntryModule(): boolean;
		getChunks(): Array<internals.Chunk>;
		getNumberOfChunks(): number;
		readonly chunksIterable: Iterable<internals.Chunk>;
		isProvided(exportName: string): boolean;
		readonly exportsArgument: string;
		readonly moduleArgument: string;
		getExportsType(
			strict: boolean
		):
			| "dynamic"
			| "dynamic-default"
			| "namespace"
			| "default-only"
			| "default-with-named";
		addPresentationalDependency(
			presentationalDependency: internals.Dependency
		): void;
		addWarning(warning: internals.WebpackError): void;
		getWarnings(): Iterable<internals.WebpackError>;
		addError(error: internals.WebpackError): void;
		getErrors(): Iterable<internals.WebpackError>;

		/**
		 * removes all warnings and errors
		 */
		clearWarningsAndErrors(): void;
		isOptional(moduleGraph: internals.ModuleGraph): boolean;
		isAccessibleInChunk(
			chunkGraph: internals.ChunkGraph,
			chunk: internals.Chunk,
			ignoreChunk: internals.Chunk
		): boolean;
		isAccessibleInChunkGroup(
			chunkGraph: internals.ChunkGraph,
			chunkGroup: internals.ChunkGroup,
			ignoreChunk: internals.Chunk
		): boolean;
		hasReasonForChunk(
			chunk: internals.Chunk,
			moduleGraph: internals.ModuleGraph,
			chunkGraph: internals.ChunkGraph
		): boolean;
		hasReasons(moduleGraph: internals.ModuleGraph): boolean;
		isModuleUsed(moduleGraph: internals.ModuleGraph): boolean;
		isExportUsed(
			moduleGraph: internals.ModuleGraph,
			exportName: string | Array<string>
		): 0 | 1 | 2 | 3 | 4;
		getUsedName(
			moduleGraph: internals.ModuleGraph,
			exportName: string | Array<string>
		): string | false | Array<string>;
		needBuild(
			context: internals.NeedBuildContext,
			callback: (arg0: internals.WebpackError, arg1: boolean) => void
		): void;
		needRebuild(fileTimestamps?: any, contextTimestamps?: any): boolean;
		invalidateBuild(): void;
		identifier(): string;
		readableIdentifier(requestShortener: internals.RequestShortener): string;
		build(
			options: internals.WebpackOptionsNormalized,
			compilation: internals.Compilation,
			resolver: internals.Resolver & internals.WithOptions,
			fs: internals.InputFileSystem,
			callback: (arg0: internals.WebpackError) => void
		): void;
		getSourceTypes(): Set<string>;
		source(sourceContext: internals.SourceContext): internals.Source;
		size(type: string): number;
		libIdent(options: internals.LibIdentOptions): string;
		nameForCondition(): string;
		getRuntimeRequirements(
			context: internals.SourceContext
		): ReadonlySet<string>;
		codeGeneration(
			context: internals.CodeGenerationContext
		): internals.CodeGenerationResult;
		chunkCondition(
			chunk: internals.Chunk,
			compilation: internals.Compilation
		): boolean;

		/**
		 * Assuming this module is in the cache. Update the (cached) module with
		 * the fresh module from the factory. Usually updates internal references
		 * and properties.
		 */
		updateCacheModule(module: internals.Module): void;
		originalSource(): internals.Source;
		useSourceMap: any;
		readonly hasEqualsChunks: any;
		readonly isUsed: any;
		readonly errors: any;
		readonly warnings: any;
		used: any;
	}
	export class ModuleConcatenationPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export abstract class ModuleDependency extends internals.Dependency {
		request: string;
		userRequest: string;
		range: any;
	}
	export abstract class ModuleFactory {
		create(
			data: internals.ModuleFactoryCreateData,
			callback: (arg0: Error, arg1: internals.ModuleFactoryResult) => void
		): void;
	}
	export interface ModuleFactoryCreateData {
		contextInfo: internals.ModuleFactoryCreateDataContextInfo;
		resolveOptions?: any;
		context: string;
		dependencies: Array<internals.Dependency>;
	}
	export interface ModuleFactoryCreateDataContextInfo {
		issuer: string;
		compiler: string;
	}
	export interface ModuleFactoryResult {
		/**
		 * the created module or unset if no module was created
		 */
		module?: internals.Module;
		fileDependencies?: Set<string>;
		contextDependencies?: Set<string>;
		missingDependencies?: Set<string>;
	}
	export namespace ModuleFilenameHelpers {
		export let ALL_LOADERS_RESOURCE: string;
		export let REGEXP_ALL_LOADERS_RESOURCE: RegExp;
		export let LOADERS_RESOURCE: string;
		export let REGEXP_LOADERS_RESOURCE: RegExp;
		export let RESOURCE: string;
		export let REGEXP_RESOURCE: RegExp;
		export let ABSOLUTE_RESOURCE_PATH: string;
		export let REGEXP_ABSOLUTE_RESOURCE_PATH: RegExp;
		export let RESOURCE_PATH: string;
		export let REGEXP_RESOURCE_PATH: RegExp;
		export let ALL_LOADERS: string;
		export let REGEXP_ALL_LOADERS: RegExp;
		export let LOADERS: string;
		export let REGEXP_LOADERS: RegExp;
		export let QUERY: string;
		export let REGEXP_QUERY: RegExp;
		export let ID: string;
		export let REGEXP_ID: RegExp;
		export let HASH: string;
		export let REGEXP_HASH: RegExp;
		export let NAMESPACE: string;
		export let REGEXP_NAMESPACE: RegExp;
		export let createFilename: (
			module: any,
			options: any,
			__2: { requestShortener: any; chunkGraph: any }
		) => any;
		export let replaceDuplicates: (
			array?: any,
			fn?: any,
			comparator?: any
		) => any;
		export let matchPart: (str?: any, test?: any) => any;
		export let matchObject: (obj?: any, str?: any) => boolean;
	}
	export abstract class ModuleGraph {
		setParents(
			dependency: internals.Dependency,
			block: internals.DependenciesBlock,
			module: internals.Module
		): void;
		getParentModule(dependency: internals.Dependency): internals.Module;
		getParentBlock(
			dependency: internals.Dependency
		): internals.DependenciesBlock;
		setResolvedModule(
			originModule: internals.Module,
			dependency: internals.Dependency,
			module: internals.Module
		): void;
		updateModule(
			dependency: internals.Dependency,
			module: internals.Module
		): void;
		removeConnection(dependency: internals.Dependency): void;
		addExplanation(dependency: internals.Dependency, explanation: string): void;
		cloneModuleAttributes(
			sourceModule: internals.Module,
			targetModule: internals.Module
		): void;
		removeModuleAttributes(module: internals.Module): void;
		removeAllModuleAttributes(): void;
		moveModuleConnections(
			oldModule: internals.Module,
			newModule: internals.Module,
			filterConnection: (arg0: internals.ModuleGraphConnection) => boolean
		): void;
		addExtraReason(module: internals.Module, explanation: string): void;
		getResolvedModule(dependency: internals.Dependency): internals.Module;
		finishModule(module: internals.Module): void;
		getConnection(
			dependency: internals.Dependency
		): internals.ModuleGraphConnection;
		getModule(dependency: internals.Dependency): internals.Module;
		getOrigin(dependency: internals.Dependency): internals.Module;
		getResolvedOrigin(dependency: internals.Dependency): internals.Module;
		getIncomingConnections(
			module: internals.Module
		): Iterable<internals.ModuleGraphConnection>;
		getOutgoingConnections(
			module: internals.Module
		): Iterable<internals.ModuleGraphConnection>;
		getProfile(module: internals.Module): internals.ModuleProfile;
		setProfile(
			module: internals.Module,
			profile: internals.ModuleProfile
		): void;
		getIssuer(module: internals.Module): internals.Module;
		setIssuer(module: internals.Module, issuer: internals.Module): void;
		setIssuerIfUnset(module: internals.Module, issuer: internals.Module): void;
		getOptimizationBailout(
			module: internals.Module
		): Array<
			string | ((requestShortener: internals.RequestShortener) => string)
		>;
		getProvidedExports(module: internals.Module): true | Array<string>;
		isExportProvided(
			module: internals.Module,
			exportName: string | Array<string>
		): boolean;
		getExportsInfo(module: internals.Module): internals.ExportsInfo;
		getExportInfo(
			module: internals.Module,
			exportName: string
		): internals.ExportInfo;
		getReadOnlyExportInfo(
			module: internals.Module,
			exportName: string
		): internals.ExportInfo;
		getUsedExports(
			module: internals.Module
		): boolean | internals.SortableSet<string>;
		getPreOrderIndex(module: internals.Module): number;
		getPostOrderIndex(module: internals.Module): number;
		setPreOrderIndex(module: internals.Module, index: number): void;
		setPreOrderIndexIfUnset(module: internals.Module, index: number): boolean;
		setPostOrderIndex(module: internals.Module, index: number): void;
		setPostOrderIndexIfUnset(module: internals.Module, index: number): boolean;
		getDepth(module: internals.Module): number;
		setDepth(module: internals.Module, depth: number): void;
		setDepthIfLower(module: internals.Module, depth: number): boolean;
		isAsync(module: internals.Module): boolean;
		setAsync(module: internals.Module): void;
		getMeta(thing?: any): any;
	}
	export abstract class ModuleGraphConnection {
		originModule: internals.Module;
		resolvedOriginModule: internals.Module;
		dependency: internals.Dependency;
		resolvedModule: internals.Module;
		module: internals.Module;
		weak: boolean;
		conditional: boolean;
		condition: (arg0: internals.ModuleGraphConnection) => boolean;
		explanations: Set<string>;
		addCondition(
			condition: (arg0: internals.ModuleGraphConnection) => boolean
		): void;
		addExplanation(explanation: string): void;
		readonly explanation: string;
		active: any;
	}

	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	export interface ModuleOptions {
		/**
		 * An array of rules applied by default for modules.
		 */
		defaultRules?: Array<internals.RuleSetRule>;

		/**
		 * Enable warnings for full dynamic dependencies.
		 */
		exprContextCritical?: boolean;

		/**
		 * Enable recursive directory lookup for full dynamic dependencies.
		 */
		exprContextRecursive?: boolean;

		/**
		 * Sets the default regular expression for full dynamic dependencies.
		 */
		exprContextRegExp?: boolean | RegExp;

		/**
		 * Set the default request for full dynamic dependencies.
		 */
		exprContextRequest?: string;

		/**
		 * Don't parse files matching. It's matched against the full resolved request.
		 */
		noParse?:
			| string
			| Function
			| RegExp
			| [string | Function | RegExp, string | Function | RegExp];

		/**
		 * An array of rules applied for modules.
		 */
		rules?: Array<internals.RuleSetRule>;

		/**
		 * Emit errors instead of warnings when imported names don't exist in imported module.
		 */
		strictExportPresence?: boolean;

		/**
		 * Handle the this context correctly according to the spec for namespace objects.
		 */
		strictThisContextOnImports?: boolean;

		/**
		 * Enable warnings when using the require function in a not statically analyse-able way.
		 */
		unknownContextCritical?: boolean;

		/**
		 * Enable recursive directory lookup when using the require function in a not statically analyse-able way.
		 */
		unknownContextRecursive?: boolean;

		/**
		 * Sets the regular expression when using the require function in a not statically analyse-able way.
		 */
		unknownContextRegExp?: boolean | RegExp;

		/**
		 * Sets the request when using the require function in a not statically analyse-able way.
		 */
		unknownContextRequest?: string;

		/**
		 * Cache the resolving of module requests.
		 */
		unsafeCache?: boolean | Function;

		/**
		 * Enable warnings for partial dynamic dependencies.
		 */
		wrappedContextCritical?: boolean;

		/**
		 * Enable recursive directory lookup for partial dynamic dependencies.
		 */
		wrappedContextRecursive?: boolean;

		/**
		 * Set the inner regular expression for partial dynamic dependencies.
		 */
		wrappedContextRegExp?: RegExp;
	}
	export interface ModulePathData {
		id: string | number;
		hash: string;
		hashWithLength?: (arg0: number) => string;
	}
	export abstract class ModuleProfile {
		startTime: number;
		factory: number;
		restoring: number;
		integration: number;
		building: number;
		storing: number;
		additionalFactories: number;
		additionalIntegration: number;
		markFactoryStart(): void;
		factoryStartTime: number;
		markFactoryEnd(): void;
		factoryEndTime: number;
		markRestoringStart(): void;
		restoringStartTime: number;
		markRestoringEnd(): void;
		restoringEndTime: number;
		markIntegrationStart(): void;
		integrationStartTime: number;
		markIntegrationEnd(): void;
		integrationEndTime: number;
		markBuildingStart(): void;
		buildingStartTime: number;
		markBuildingEnd(): void;
		buildingEndTime: number;
		markStoringStart(): void;
		storingStartTime: number;
		markStoringEnd(): void;
		storingEndTime: number;

		/**
		 * Merge this profile into another one
		 */
		mergeInto(realProfile: internals.ModuleProfile): void;
	}
	export abstract class ModuleTemplate {
		type: string;
		hooks: Readonly<{
			content: { tap: (options?: any, fn?: any) => void };
			module: { tap: (options?: any, fn?: any) => void };
			render: { tap: (options?: any, fn?: any) => void };
			package: { tap: (options?: any, fn?: any) => void };
			hash: { tap: (options?: any, fn?: any) => void };
		}>;
		readonly runtimeTemplate: any;
	}
	export class MultiCompiler {
		constructor(
			compilers: Array<internals.Compiler> | Record<string, internals.Compiler>
		);
		hooks: Readonly<{
			done: SyncHook<[internals.MultiStats], void>;
			invalid: MultiHook<SyncHook<[string, string], void>>;
			run: MultiHook<AsyncSeriesHook<[internals.Compiler]>>;
			watchClose: SyncHook<[], void>;
			watchRun: MultiHook<AsyncSeriesHook<[internals.Compiler]>>;
			infrastructureLog: MultiHook<
				SyncBailHook<[string, string, Array<any>], true>
			>;
		}>;
		compilers: Array<internals.Compiler>;
		dependencies: WeakMap<internals.Compiler, Array<string>>;
		running: boolean;
		readonly options: Array<internals.WebpackOptionsNormalized>;
		readonly outputPath: string;
		inputFileSystem: internals.InputFileSystem;
		outputFileSystem: internals.OutputFileSystem;
		intermediateFileSystem: internals.InputFileSystem &
			internals.OutputFileSystem &
			internals.IntermediateFileSystemExtras;
		getInfrastructureLogger(name?: any): internals.WebpackLogger;
		setDependencies(
			compiler: internals.Compiler,
			dependencies: Array<string>
		): void;
		validateDependencies(
			callback: internals.CallbackCompiler<internals.MultiStats>
		): boolean;
		runWithDependencies(
			compilers: Array<internals.Compiler>,
			fn: (
				compiler: internals.Compiler,
				callback: internals.CallbackCompiler<internals.MultiStats>
			) => any,
			callback: internals.CallbackCompiler<internals.MultiStats>
		): void;
		watch(
			watchOptions: internals.WatchOptions | Array<internals.WatchOptions>,
			handler: internals.CallbackCompiler<internals.MultiStats>
		): internals.MultiWatching;
		run(callback: internals.CallbackCompiler<internals.MultiStats>): void;
		purgeInputFileSystem(): void;
		close(callback: internals.CallbackCompiler<void>): void;
	}
	export abstract class MultiStats {
		stats: Array<internals.Stats>;
		hash: string;
		hasErrors(): boolean;
		hasWarnings(): boolean;
		toJson(
			options?: any
		): {
			children: Array<any>;
			version: any;
			hash: string;
			errors: Array<any>;
			warnings: Array<any>;
		};
		toString(options?: any): string;
	}
	export abstract class MultiWatching {
		watchings: Array<internals.Watching>;
		compiler: internals.MultiCompiler;
		invalidate(): void;
		suspend(): void;
		resume(): void;
		close(callback: internals.CallbackCompiler<void>): void;
	}
	export class NamedChunkIdsPlugin {
		constructor(options?: any);
		delimiter: any;
		context: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class NamedModuleIdsPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class NaturalModuleIdsPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface NeedBuildContext {
		fileSystemInfo: internals.FileSystemInfo;
	}
	export class NoEmitOnErrorsPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type Node = false | internals.NodeOptions;
	export class NodeEnvironmentPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * Options object for node compatibility features.
	 */
	export interface NodeOptions {
		/**
		 * Include a polyfill for the 'global' variable.
		 */
		global?: boolean;
	}
	export class NodeTemplatePlugin {
		constructor(options?: any);
		asyncChunkLoading: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export class NormalModule extends internals.Module {
		constructor(__0: {
			/**
			 * module type
			 */
			type: string;
			/**
			 * request string
			 */
			request: string;
			/**
			 * request intended by user (without loaders from config)
			 */
			userRequest: string;
			/**
			 * request without resolving
			 */
			rawRequest: string;
			/**
			 * list of loaders
			 */
			loaders: Array<internals.LoaderItem>;
			/**
			 * path + query of the real resource
			 */
			resource: string;
			/**
			 * path + query of the matched resource (virtual)
			 */
			matchResource: string;
			/**
			 * the parser used
			 */
			parser: internals.Parser;
			/**
			 * the generator used
			 */
			generator: internals.Generator;
			/**
			 * options used for resolving requests from this module
			 */
			resolveOptions: any;
		});
		request: string;
		userRequest: string;
		rawRequest: string;
		binary: boolean;
		parser: internals.Parser;
		generator: internals.Generator;
		resource: string;
		matchResource: string;
		loaders: Array<internals.LoaderItem>;
		error: internals.WebpackError;
		createSourceForAsset(
			context: string,
			name: string,
			content: string,
			sourceMap?: any,
			associatedObjectForCache?: any
		): internals.Source;
		createLoaderContext(
			resolver: internals.Resolver & internals.WithOptions,
			options: internals.WebpackOptionsNormalized,
			compilation: internals.Compilation,
			fs: internals.InputFileSystem
		): any;
		getCurrentLoader(loaderContext?: any, index?: any): internals.LoaderItem;
		createSource(
			context: string,
			content: string | Buffer,
			sourceMap?: any,
			associatedObjectForCache?: any
		): internals.Source;
		doBuild(
			options: internals.WebpackOptionsNormalized,
			compilation: internals.Compilation,
			resolver: internals.Resolver & internals.WithOptions,
			fs: internals.InputFileSystem,
			callback: (arg0: internals.WebpackError) => void
		): void;
		markModuleAsErrored(error: internals.WebpackError): void;
		applyNoParseRule(rule?: any, content?: any): any;
		shouldPreventParsing(noParseRule?: any, request?: any): any;
		static getCompilationHooks(
			compilation: internals.Compilation
		): internals.NormalModuleCompilationHooks;
		static deserialize(context?: any): internals.NormalModule;
	}
	export interface NormalModuleCompilationHooks {
		loader: SyncHook<[any, internals.NormalModule], void>;
	}
	export abstract class NormalModuleFactory extends internals.ModuleFactory {
		hooks: Readonly<{
			resolve: AsyncSeriesBailHook<[internals.ResolveData], any>;
			factorize: AsyncSeriesBailHook<[internals.ResolveData], any>;
			beforeResolve: AsyncSeriesBailHook<[internals.ResolveData], any>;
			afterResolve: AsyncSeriesBailHook<[internals.ResolveData], any>;
			createModule: SyncBailHook<[internals.ResolveData], any>;
			module: SyncWaterfallHook<[internals.Module, any, internals.ResolveData]>;
			createParser: HookMap<SyncBailHook<any, any>>;
			parser: HookMap<SyncHook<any, void>>;
			createGenerator: HookMap<SyncBailHook<any, any>>;
			generator: HookMap<SyncHook<any, void>>;
		}>;
		resolverFactory: any;
		ruleSet: internals.RuleSet;
		unsafeCache: boolean;
		cachePredicate: any;
		context: any;
		fs: any;
		parserCache: Map<string, WeakMap<any, any>>;
		generatorCache: Map<string, WeakMap<any, internals.Generator>>;
		resolveRequestArray(
			contextInfo?: any,
			context?: any,
			array?: any,
			resolver?: any,
			resolveContext?: any,
			callback?: any
		): any;
		getParser(type?: any, parserOptions?: {}): any;
		createParser(type?: any, parserOptions?: {}): any;
		getGenerator(type?: any, generatorOptions?: {}): internals.Generator;
		createGenerator(type?: any, generatorOptions?: {}): any;
		getResolver(type?: any, resolveOptions?: any): any;
	}
	export class NormalModuleReplacementPlugin {
		/**
		 * Create an instance of the plugin
		 */
		constructor(
			resourceRegExp: RegExp,
			newResource: string | ((arg0?: any) => void)
		);
		resourceRegExp: RegExp;
		newResource: string | ((arg0?: any) => void);

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface ObjectDeserializerContext {
		read: () => any;
	}
	export interface ObjectSerializer {
		serialize: (arg0: any, arg1: internals.ObjectSerializerContext) => void;
		deserialize: (arg0: internals.ObjectDeserializerContext) => any;
	}
	export interface ObjectSerializerContext {
		write: (arg0?: any) => void;
	}
	export class OccurrenceChunkIdsPlugin {
		constructor(options?: internals.OccurrenceChunkIdsPluginOptions);
		options: internals.OccurrenceChunkIdsPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface OccurrenceChunkIdsPluginOptions {
		/**
		 * Prioritise initial size over total size.
		 */
		prioritiseInitial?: boolean;
	}
	export class OccurrenceModuleIdsPlugin {
		constructor(options?: internals.OccurrenceModuleIdsPluginOptions);
		options: internals.OccurrenceModuleIdsPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface OccurrenceModuleIdsPluginOptions {
		/**
		 * Prioritise initial size over total size.
		 */
		prioritiseInitial?: boolean;
	}

	/**
	 * Enables/Disables integrated optimizations.
	 */
	export interface Optimization {
		/**
		 * Check for incompatible wasm types when importing/exporting from/to ESM.
		 */
		checkWasmTypes?: boolean;

		/**
		 * Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin).
		 */
		chunkIds?:
			| false
			| "natural"
			| "named"
			| "deterministic"
			| "size"
			| "total-size";

		/**
		 * Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer.
		 */
		concatenateModules?: boolean;

		/**
		 * Also flag chunks as loaded which contain a subset of the modules.
		 */
		flagIncludedChunks?: boolean;

		/**
		 * Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection.
		 */
		innerGraph?: boolean;

		/**
		 * Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports).
		 */
		mangleExports?: boolean;

		/**
		 * Reduce size of WASM by changing imports to shorter strings.
		 */
		mangleWasmImports?: boolean;

		/**
		 * Merge chunks which contain the same modules.
		 */
		mergeDuplicateChunks?: boolean;

		/**
		 * Enable minimizing the output. Uses optimization.minimizer.
		 */
		minimize?: boolean;

		/**
		 * Minimizer(s) to use for minimizing the output.
		 */
		minimizer?: Array<
			internals.WebpackPluginInstance | ((compiler: internals.Compiler) => void)
		>;

		/**
		 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin).
		 */
		moduleIds?:
			| false
			| "natural"
			| "named"
			| "deterministic"
			| "size"
			| "hashed";

		/**
		 * Avoid emitting assets when errors occur.
		 */
		noEmitOnErrors?: boolean;

		/**
		 * Set process.env.NODE_ENV to a specific value.
		 */
		nodeEnv?: string | false;

		/**
		 * Generate records with relative paths to be able to move the context folder.
		 */
		portableRecords?: boolean;

		/**
		 * Figure out which exports are provided by modules to generate more efficient code.
		 */
		providedExports?: boolean;

		/**
		 * Removes modules from chunks when these modules are already included in all parents.
		 */
		removeAvailableModules?: boolean;

		/**
		 * Remove chunks which are empty.
		 */
		removeEmptyChunks?: boolean;

		/**
		 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
		 */
		runtimeChunk?:
			| boolean
			| "single"
			| "multiple"
			| {
					/**
					 * The name or name factory for the runtime chunks.
					 */
					name?: string | Function;
			  };

		/**
		 * Skip over modules which are flagged to contain no side effects when exports are not used.
		 */
		sideEffects?: boolean;

		/**
		 * Optimize duplication and caching by splitting chunks by shared modules and cache group.
		 */
		splitChunks?: false | internals.OptimizationSplitChunksOptions;

		/**
		 * Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code.
		 */
		usedExports?: boolean;
	}
	export type OptimizationRuntimeChunk =
		| boolean
		| "single"
		| "multiple"
		| {
				/**
				 * The name or name factory for the runtime chunks.
				 */
				name?: string | Function;
		  };

	/**
	 * Options object for describing behavior of a cache group selecting modules that should be cached together.
	 */
	export interface OptimizationSplitChunksCacheGroup {
		/**
		 * Sets the name delimiter for created chunks.
		 */
		automaticNameDelimiter?: string;

		/**
		 * Select chunks for determining cache group content (defaults to "initial", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?:
			| "initial"
			| "async"
			| "all"
			| ((
					module: internals.Module
			  ) =>
					| void
					| internals.OptimizationSplitChunksCacheGroup
					| Array<internals.OptimizationSplitChunksCacheGroup>);

		/**
		 * Ignore minimum size, minimum chunks and maximum requests and always create chunks for this cache group.
		 */
		enforce?: boolean;

		/**
		 * Sets the template for the filename for created chunks.
		 */
		filename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * Sets the hint for chunk id.
		 */
		idHint?: string;

		/**
		 * Maximum number of requests which are accepted for on-demand loading.
		 */
		maxAsyncRequests?: number;

		/**
		 * Maximal size hint for the on-demand chunks.
		 */
		maxAsyncSize?: number | { [index: string]: number };

		/**
		 * Maximum number of initial chunks which are accepted for an entry point.
		 */
		maxInitialRequests?: number;

		/**
		 * Maximal size hint for the initial chunks.
		 */
		maxInitialSize?: number | { [index: string]: number };

		/**
		 * Maximal size hint for the created chunks.
		 */
		maxSize?: number | { [index: string]: number };

		/**
		 * Minimum number of times a module has to be duplicated until it's considered for splitting.
		 */
		minChunks?: number;

		/**
		 * Minimal size for the chunks the stay after moving the modules to a new chunk.
		 */
		minRemainingSize?: number | { [index: string]: number };

		/**
		 * Minimal size for the created chunk.
		 */
		minSize?: number | { [index: string]: number };

		/**
		 * Give chunks for this cache group a name (chunks with equal name are merged).
		 */
		name?: string | false | Function;

		/**
		 * Priority of this cache group.
		 */
		priority?: number;

		/**
		 * Try to reuse existing chunk (with name) when it has matching modules.
		 */
		reuseExistingChunk?: boolean;

		/**
		 * Assign modules to a cache group by module name.
		 */
		test?: string | Function | RegExp;

		/**
		 * Assign modules to a cache group by module type.
		 */
		type?: string | Function | RegExp;
	}

	/**
	 * Options object for splitting chunks into smaller chunks.
	 */
	export interface OptimizationSplitChunksOptions {
		/**
		 * Sets the name delimiter for created chunks.
		 */
		automaticNameDelimiter?: string;

		/**
		 * Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks, default categories: 'default', 'defaultVendors').
		 */
		cacheGroups?: {
			[index: string]:
				| string
				| false
				| Function
				| RegExp
				| internals.OptimizationSplitChunksCacheGroup;
		};

		/**
		 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?: Function | "initial" | "async" | "all";

		/**
		 * Options for modules not selected by any other cache group.
		 */
		fallbackCacheGroup?: {
			/**
			 * Sets the name delimiter for created chunks.
			 */
			automaticNameDelimiter?: string;
			/**
			 * Maximal size hint for the on-demand chunks.
			 */
			maxAsyncSize?: number | { [index: string]: number };
			/**
			 * Maximal size hint for the initial chunks.
			 */
			maxInitialSize?: number | { [index: string]: number };
			/**
			 * Maximal size hint for the created chunks.
			 */
			maxSize?: number | { [index: string]: number };
			/**
			 * Minimal size for the created chunk.
			 */
			minSize?: number | { [index: string]: number };
		};

		/**
		 * Sets the template for the filename for created chunks.
		 */
		filename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * Prevents exposing path info when creating names for parts splitted by maxSize.
		 */
		hidePathInfo?: boolean;

		/**
		 * Maximum number of requests which are accepted for on-demand loading.
		 */
		maxAsyncRequests?: number;

		/**
		 * Maximal size hint for the on-demand chunks.
		 */
		maxAsyncSize?: number | { [index: string]: number };

		/**
		 * Maximum number of initial chunks which are accepted for an entry point.
		 */
		maxInitialRequests?: number;

		/**
		 * Maximal size hint for the initial chunks.
		 */
		maxInitialSize?: number | { [index: string]: number };

		/**
		 * Maximal size hint for the created chunks.
		 */
		maxSize?: number | { [index: string]: number };

		/**
		 * Minimum number of times a module has to be duplicated until it's considered for splitting.
		 */
		minChunks?: number;

		/**
		 * Minimal size for the chunks the stay after moving the modules to a new chunk.
		 */
		minRemainingSize?: number | { [index: string]: number };

		/**
		 * Minimal size for the created chunks.
		 */
		minSize?: number | { [index: string]: number };

		/**
		 * Give chunks created a name (chunks with equal name are merged).
		 */
		name?: string | false | Function;
	}
	export type OptimizationSplitChunksSizes =
		| number
		| { [index: string]: number };
	export abstract class OptionsApply {
		process(options?: any, compiler?: any): void;
	}

	/**
	 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	export interface Output {
		/**
		 * The filename of asset modules as relative path inside the `output.path` directory.
		 */
		assetModuleFilename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * Add a comment in the UMD wrapper.
		 */
		auxiliaryComment?: string | internals.LibraryCustomUmdCommentObject;

		/**
		 * The callback function name used by webpack for loading of chunks in WebWorkers.
		 */
		chunkCallbackName?: string;

		/**
		 * The filename of non-entry chunks as relative path inside the `output.path` directory.
		 */
		chunkFilename?: string;

		/**
		 * Number of milliseconds before chunk request expires.
		 */
		chunkLoadTimeout?: number;

		/**
		 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
		 */
		compareBeforeEmit?: boolean;

		/**
		 * This option enables cross-origin loading of chunks.
		 */
		crossOriginLoading?: false | "anonymous" | "use-credentials";

		/**
		 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
		 */
		devtoolFallbackModuleFilenameTemplate?: string | Function;

		/**
		 * Filename template string of function for the sources array in a generated SourceMap.
		 */
		devtoolModuleFilenameTemplate?: string | Function;

		/**
		 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
		 */
		devtoolNamespace?: string;

		/**
		 * The maximum EcmaScript version of the webpack generated code (doesn't include input source code from modules).
		 */
		ecmaVersion?: number;

		/**
		 * List of library types enabled for use by entry points.
		 */
		enabledLibraryTypes?: Array<
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system"
		>;

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * An expression which is used to address the global object/scope in runtime code.
		 */
		globalObject?: string;

		/**
		 * Digest type used for the hash.
		 */
		hashDigest?: string;

		/**
		 * Number of chars which are used for the hash.
		 */
		hashDigestLength?: number;

		/**
		 * Algorithm used for generation the hash (see node.js crypto package).
		 */
		hashFunction?: string | typeof internals.Hash;

		/**
		 * Any string which is added to the hash to salt it.
		 */
		hashSalt?: string;

		/**
		 * The filename of the Hot Update Chunks. They are inside the output.path directory.
		 */
		hotUpdateChunkFilename?: string;

		/**
		 * The JSONP function used by webpack for async loading of hot update chunks.
		 */
		hotUpdateFunction?: string;

		/**
		 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
		 */
		hotUpdateMainFilename?: string;

		/**
		 * Wrap javascript code into IIFE's to avoid leaking into global scope.
		 */
		iife?: boolean;

		/**
		 * The JSONP function used by webpack for async loading of chunks.
		 */
		jsonpFunction?: string;

		/**
		 * This option enables loading async chunks via a custom script type, such as script type="module".
		 */
		jsonpScriptType?: false | "module" | "text/javascript";

		/**
		 * Make the output files a library, exporting the exports of the entry point.
		 */
		library?:
			| string
			| Array<string>
			| internals.LibraryCustomUmdObject
			| internals.LibraryOptions;

		/**
		 * Specify which export should be exposed as library.
		 */
		libraryExport?: string | Array<string>;

		/**
		 * Type of library.
		 */
		libraryTarget?:
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system";

		/**
		 * Output javascript files as module source type.
		 */
		module?: boolean;

		/**
		 * The output directory as **absolute path** (required).
		 */
		path?: string;

		/**
		 * Include comments with information about the modules.
		 */
		pathinfo?: boolean;

		/**
		 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
		 */
		publicPath?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
		 */
		sourceMapFilename?: string;

		/**
		 * Prefixes every line of the source in the bundle with this string.
		 */
		sourcePrefix?: string;

		/**
		 * Handles exceptions in module loading correctly at a performance cost.
		 */
		strictModuleExceptionHandling?: boolean;

		/**
		 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
		 */
		umdNamedDefine?: boolean;

		/**
		 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
		 */
		uniqueName?: string;

		/**
		 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
		 */
		webassemblyModuleFilename?: string;
	}
	export interface OutputFileSystem {
		writeFile: (
			arg0: string,
			arg1: string | Buffer,
			arg2: (arg0: NodeJS.ErrnoException) => void
		) => void;
		mkdir: (arg0: string, arg1: (arg0: NodeJS.ErrnoException) => void) => void;
		stat: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: FsStats) => void
		) => void;
		readFile: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: Buffer) => void
		) => void;
		join?: (arg0: string, arg1: string) => string;
		relative?: (arg0: string, arg1: string) => string;
		dirname?: (arg0: string) => string;
	}

	/**
	 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	export interface OutputNormalized {
		/**
		 * The filename of asset modules as relative path inside the `output.path` directory.
		 */
		assetModuleFilename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * The callback function name used by webpack for loading of chunks in WebWorkers.
		 */
		chunkCallbackName?: string;

		/**
		 * The filename of non-entry chunks as relative path inside the `output.path` directory.
		 */
		chunkFilename?: string;

		/**
		 * Number of milliseconds before chunk request expires.
		 */
		chunkLoadTimeout?: number;

		/**
		 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
		 */
		compareBeforeEmit?: boolean;

		/**
		 * This option enables cross-origin loading of chunks.
		 */
		crossOriginLoading?: false | "anonymous" | "use-credentials";

		/**
		 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
		 */
		devtoolFallbackModuleFilenameTemplate?: string | Function;

		/**
		 * Filename template string of function for the sources array in a generated SourceMap.
		 */
		devtoolModuleFilenameTemplate?: string | Function;

		/**
		 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
		 */
		devtoolNamespace?: string;

		/**
		 * The maximum EcmaScript version of the webpack generated code (doesn't include input source code from modules).
		 */
		ecmaVersion?: number;

		/**
		 * List of library types enabled for use by entry points.
		 */
		enabledLibraryTypes?: Array<
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system"
		>;

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * An expression which is used to address the global object/scope in runtime code.
		 */
		globalObject?: string;

		/**
		 * Digest type used for the hash.
		 */
		hashDigest?: string;

		/**
		 * Number of chars which are used for the hash.
		 */
		hashDigestLength?: number;

		/**
		 * Algorithm used for generation the hash (see node.js crypto package).
		 */
		hashFunction?: string | typeof internals.Hash;

		/**
		 * Any string which is added to the hash to salt it.
		 */
		hashSalt?: string;

		/**
		 * The filename of the Hot Update Chunks. They are inside the output.path directory.
		 */
		hotUpdateChunkFilename?: string;

		/**
		 * The JSONP function used by webpack for async loading of hot update chunks.
		 */
		hotUpdateFunction?: string;

		/**
		 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
		 */
		hotUpdateMainFilename?: string;

		/**
		 * Wrap javascript code into IIFE's to avoid leaking into global scope.
		 */
		iife?: boolean;

		/**
		 * The JSONP function used by webpack for async loading of chunks.
		 */
		jsonpFunction?: string;

		/**
		 * This option enables loading async chunks via a custom script type, such as script type="module".
		 */
		jsonpScriptType?: false | "module" | "text/javascript";

		/**
		 * Options for library.
		 */
		library?: internals.LibraryOptions;

		/**
		 * Output javascript files as module source type.
		 */
		module?: boolean;

		/**
		 * The output directory as **absolute path** (required).
		 */
		path?: string;

		/**
		 * Include comments with information about the modules.
		 */
		pathinfo?: boolean;

		/**
		 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
		 */
		publicPath?:
			| string
			| ((
					pathData: internals.PathData,
					assetInfo: internals.AssetInfo
			  ) => string);

		/**
		 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
		 */
		sourceMapFilename?: string;

		/**
		 * Prefixes every line of the source in the bundle with this string.
		 */
		sourcePrefix?: string;

		/**
		 * Handles exceptions in module loading correctly at a performance cost.
		 */
		strictModuleExceptionHandling?: boolean;

		/**
		 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
		 */
		uniqueName?: string;

		/**
		 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
		 */
		webassemblyModuleFilename?: string;
	}
	export class Parser {
		constructor();
		parse(
			source: string | Buffer | Record<string, any>,
			state: Record<string, any> & internals.ParserStateBase
		): Record<string, any> & internals.ParserStateBase;
	}
	export interface ParserStateBase {
		current: internals.NormalModule;
		module: internals.NormalModule;
		compilation: internals.Compilation;
		options: any;
	}
	export interface PathData {
		chunkGraph?: internals.ChunkGraph;
		hash?: string;
		hashWithLength?: (arg0: number) => string;
		chunk?: internals.Chunk | internals.ChunkPathData;
		module?: internals.Module | internals.ModulePathData;
		filename?: string;
		basename?: string;
		query?: string;
		contentHashType?: string;
		contentHash?: string;
		contentHashWithLength?: (arg0: number) => string;
		noChunkHash?: boolean;
		url?: string;
	}
	export type Performance = false | internals.PerformanceOptions;

	/**
	 * Configuration object for web performance recommendations.
	 */
	export interface PerformanceOptions {
		/**
		 * Filter function to select assets that are checked.
		 */
		assetFilter?: Function;

		/**
		 * Sets the format of the hints: warnings, errors or nothing at all.
		 */
		hints?: false | "error" | "warning";

		/**
		 * File size limit (in bytes) when exceeded, that webpack will provide performance hints.
		 */
		maxAssetSize?: number;

		/**
		 * Total size of an entry point (in bytes).
		 */
		maxEntrypointSize?: number;
	}
	export interface Plugin {
		apply: () => void;
	}
	export class PrefetchPlugin {
		constructor(context?: any, request?: any);
		context: any;
		request: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface PrintedElement {
		element: string;
		content: string;
	}
	export interface Problem {
		type:
			| "unknown-argument"
			| "unexpected-non-array-in-path"
			| "unexpected-non-object-in-path"
			| "multiple-values-unexpected"
			| "invalid-value";
		path: string;
		argument: string;
		value?: any;
		index?: number;
		expected?: string;
	}
	export class Profiler {
		constructor(inspector?: any);
		session: any;
		inspector: any;
		hasSession(): boolean;
		startProfiling(): Promise<void> | Promise<[any, any, any]>;
		sendCommand(method?: any, params?: any): Promise<any>;
		destroy(): Promise<void>;
		stopProfiling(): Promise<any>;
	}
	export class ProfilingPlugin {
		constructor(options?: internals.ProfilingPluginOptions);
		outputPath: string;
		apply(compiler?: any): void;
		static Profiler: typeof internals.Profiler;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface ProfilingPluginOptions {
		/**
		 * Path to the output file e.g. `path.resolve(__dirname, 'profiling/events.json')`. Defaults to `events.json`.
		 */
		outputPath?: string;
	}
	export class ProgressPlugin {
		constructor(
			options:
				| internals.ProgressPluginOptions
				| ((percentage: number, msg: string, ...args: Array<string>) => void)
		);
		profile: boolean;
		handler: (percentage: number, msg: string, ...args: Array<string>) => void;
		modulesCount: number;
		dependenciesCount: number;
		showEntries: boolean;
		showModules: boolean;
		showDependencies: boolean;
		showActiveModules: boolean;
		percentBy: "dependencies" | "modules" | "entries";
		apply(compiler: internals.Compiler | internals.MultiCompiler): void;
		static getReporter(
			compiler: internals.Compiler
		): (p: number, args: Array<string>) => void;
		static defaultOptions: {
			profile: boolean;
			modulesCount: number;
			dependenciesCount: number;
			modules: boolean;
			dependencies: boolean;
			activeModules: boolean;
			entries: boolean;
		};
	}
	export type ProgressPluginArgument =
		| internals.ProgressPluginOptions
		| ((percentage: number, msg: string, ...args: Array<string>) => void);

	/**
	 * Options object for the ProgressPlugin.
	 */
	export interface ProgressPluginOptions {
		/**
		 * Show active modules count and one active module in progress message.
		 */
		activeModules?: boolean;

		/**
		 * Show dependencies count in progress message.
		 */
		dependencies?: boolean;

		/**
		 * Minimum dependencies count to start with. For better progress calculation. Default: 10000.
		 */
		dependenciesCount?: number;

		/**
		 * Show entries count in progress message.
		 */
		entries?: boolean;

		/**
		 * Function that executes for every progress step.
		 */
		handler?: (percentage: number, msg: string, ...args: Array<string>) => void;

		/**
		 * Show modules count in progress message.
		 */
		modules?: boolean;

		/**
		 * Minimum modules count to start with. For better progress calculation. Default: 5000.
		 */
		modulesCount?: number;

		/**
		 * Collect percent algorithm. By default it calculates by a median from modules, entries and dependencies percent.
		 */
		percentBy?: "dependencies" | "modules" | "entries";

		/**
		 * Collect profile data for progress steps. Default: false.
		 */
		profile?: boolean;
	}
	export class ProvidePlugin {
		constructor(definitions: Record<string, string | Array<string>>);
		definitions: Record<string, string | Array<string>>;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export type PublicPath =
		| string
		| ((
				pathData: internals.PathData,
				assetInfo: internals.AssetInfo
		  ) => string);
	export interface RawChunkGroupOptions {
		preloadOrder?: number;
		prefetchOrder?: number;
	}
	export class ReadFileCompileWasmPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface RealDependencyLocation {
		start: internals.SourcePosition;
		end?: internals.SourcePosition;
		index?: number;
	}
	export type RecursiveArrayOrRecord =
		| string
		| number
		| bigint
		| boolean
		| Function
		| RegExp
		| internals.RuntimeValue
		| { [index: string]: RecursiveArrayOrRecordDeclarations }
		| Array<RecursiveArrayOrRecordDeclarations>;
	type RecursiveArrayOrRecordDeclarations =
		| string
		| number
		| bigint
		| boolean
		| Function
		| RegExp
		| internals.RuntimeValue
		| { [index: string]: RecursiveArrayOrRecordDeclarations }
		| Array<RecursiveArrayOrRecordDeclarations>;
	export interface RenderBootstrapContext {
		/**
		 * the chunk
		 */
		chunk: internals.Chunk;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;

		/**
		 * hash to be used for render call
		 */
		hash: string;
	}
	export interface RenderContextAsyncWebAssemblyModulesPlugin {
		/**
		 * the chunk
		 */
		chunk: any;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: any;

		/**
		 * the runtime template
		 */
		runtimeTemplate: any;

		/**
		 * the module graph
		 */
		moduleGraph: any;

		/**
		 * the chunk graph
		 */
		chunkGraph: any;

		/**
		 * results of code generation
		 */
		codeGenerationResults: Map<
			internals.Module,
			internals.CodeGenerationResult
		>;
	}
	export interface RenderContextJavascriptModulesPlugin {
		/**
		 * the chunk
		 */
		chunk: internals.Chunk;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;

		/**
		 * results of code generation
		 */
		codeGenerationResults: Map<
			internals.Module,
			internals.CodeGenerationResult
		>;
	}
	export interface RenderContextModuleTemplate {
		/**
		 * the chunk
		 */
		chunk: internals.Chunk;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;
	}
	export interface RenderManifestEntry {
		render: () => internals.Source;
		filenameTemplate:
			| string
			| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string);
		pathOptions?: internals.PathData;
		identifier: string;
		hash?: string;
		auxiliary?: boolean;
	}
	export interface RenderManifestOptions {
		/**
		 * the chunk used to render
		 */
		chunk: internals.Chunk;
		hash: string;
		fullHash: string;
		outputOptions: any;
		codeGenerationResults: Map<
			internals.Module,
			internals.CodeGenerationResult
		>;
		moduleTemplates: { javascript: internals.ModuleTemplate };
		dependencyTemplates: internals.DependencyTemplates;
		runtimeTemplate: internals.RuntimeTemplate;
		moduleGraph: internals.ModuleGraph;
		chunkGraph: internals.ChunkGraph;
	}
	export abstract class ReplaceSource extends internals.Source {
		replace(start: number, end: number, newValue: string, name: string): void;
		insert(pos: number, newValue: string, name: string): void;
		getName(): string;
		original(): string;
		getReplacements(): Array<{
			start: number;
			end: number;
			content: string;
			insertIndex: number;
			name: string;
		}>;
	}
	export abstract class RequestShortener {
		contextify: (arg0: string) => string;
		shorten(request: string): string;
	}

	/**
	 * istanbul ignore next
	 */
	export interface ResolveBuildDependenciesResult {
		/**
		 * list of files
		 */
		files: Set<string>;

		/**
		 * list of directories
		 */
		directories: Set<string>;

		/**
		 * list of missing entries
		 */
		missing: Set<string>;

		/**
		 * stored resolve results
		 */
		resolveResults: Map<string, string>;

		/**
		 * dependencies of the resolving
		 */
		resolveDependencies: {
			/**
			 * list of files
			 */
			files: Set<string>;
			/**
			 * list of directories
			 */
			directories: Set<string>;
			/**
			 * list of missing entries
			 */
			missing: Set<string>;
		};
	}
	export interface ResolveContext {
		log?: (message: string) => void;
		fileDependencies?: internals.WriteOnlySet<string>;
		contextDependencies?: internals.WriteOnlySet<string>;
		missingDependencies?: internals.WriteOnlySet<string>;
		stack?: Set<string>;
	}
	export interface ResolveData {
		contextInfo: internals.ModuleFactoryCreateDataContextInfo;
		resolveOptions: any;
		context: string;
		request: string;
		dependencies: Array<internals.ModuleDependency>;
		createData: any;
		fileDependencies: internals.LazySet<string>;
		missingDependencies: internals.LazySet<string>;
		contextDependencies: internals.LazySet<string>;
	}

	/**
	 * Options object for resolving requests.
	 */
	export interface ResolveOptions {
		/**
		 * Redirect module requests.
		 */
		alias?:
			| Array<{
					/**
					 * New request.
					 */
					alias: string | false | Array<string>;
					/**
					 * Request to be redirected.
					 */
					name: string;
					/**
					 * Redirect only exact matching request.
					 */
					onlyModule?: boolean;
			  }>
			| { [index: string]: string | false | Array<string> };

		/**
		 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
		 */
		aliasFields?: Array<string | Array<string>>;

		/**
		 * Enable caching of successfully resolved requests (cache entries are revalidated).
		 */
		cache?: boolean;

		/**
		 * Predicate function to decide which requests should be cached.
		 */
		cachePredicate?: Function;

		/**
		 * Include the context information in the cache identifier when caching.
		 */
		cacheWithContext?: boolean;

		/**
		 * Filenames used to find a description file (like a package.json).
		 */
		descriptionFiles?: Array<string>;

		/**
		 * Enforce using one of the extensions from the extensions option.
		 */
		enforceExtension?: boolean;

		/**
		 * Extensions added to the request when trying to find the file.
		 */
		extensions?: Array<string>;

		/**
		 * Filesystem for the resolver.
		 */
		fileSystem?: { [index: string]: any };

		/**
		 * Field names from the description file (package.json) which are used to find the default entry point.
		 */
		mainFields?: Array<string | Array<string>>;

		/**
		 * Filenames used to find the default entry point if there is no description file or main field.
		 */
		mainFiles?: Array<string>;

		/**
		 * Folder names or directory paths where to find modules.
		 */
		modules?: Array<string>;

		/**
		 * Plugins for the resolver.
		 */
		plugins?: Array<internals.ResolvePluginInstance>;

		/**
		 * Custom resolver.
		 */
		resolver?: { [index: string]: any };

		/**
		 * Enable resolving symlinks to the original location.
		 */
		symlinks?: boolean;

		/**
		 * Enable caching of successfully resolved requests (cache entries are not revalidated).
		 */
		unsafeCache?: boolean | { [index: string]: any };

		/**
		 * Use synchronous filesystem calls for the resolver.
		 */
		useSyncFileSystemCalls?: boolean;
	}

	/**
	 * Plugin instance.
	 */
	export interface ResolvePluginInstance {
		[index: string]: any;

		/**
		 * The run point of the plugin, required method.
		 */
		apply: (resolver?: any) => void;
	}
	export abstract class Resolver {
		resolve(
			context: Object,
			path: string,
			request: string,
			resolveContext: internals.ResolveContext,
			callback: (
				err: NodeJS.ErrnoException,
				result: string,
				additionalInfo: Object
			) => void
		): void;
	}
	export interface ResolverCache {
		direct: WeakMap<any, internals.Resolver & internals.WithOptions>;
		stringified: Map<string, internals.Resolver & internals.WithOptions>;
	}
	export abstract class ResolverFactory {
		hooks: Readonly<{
			resolveOptions: HookMap<SyncWaterfallHook<[any]>>;
			resolver: HookMap<SyncHook<[internals.Resolver, any, any], void>>;
		}>;
		cache: Map<string, internals.ResolverCache>;
		get(
			type: string,
			resolveOptions?: any
		): internals.Resolver & internals.WithOptions;
	}
	export interface RuleSet {
		/**
		 * map of references in the rule set (may grow over time)
		 */
		references: Map<string, any>;

		/**
		 * execute the rule set
		 */
		exec: (arg0?: any) => Array<internals.Effect>;
	}
	export type RuleSetCondition =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionWebpackOptions>;
	export type RuleSetConditionAbsolute =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionAbsoluteWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionAbsoluteWebpackOptions>;
	type RuleSetConditionAbsoluteWebpackOptions =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionAbsoluteWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionAbsoluteWebpackOptions>;
	type RuleSetConditionWebpackOptions =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionWebpackOptions>;
	export type RuleSetLoaderOptions = string | { [index: string]: any };

	/**
	 * A rule description with conditions and effects for modules.
	 */
	export interface RuleSetRule {
		/**
		 * Match the child compiler name.
		 */
		compiler?:
			| string
			| RegExp
			| {
					/**
					 * Logical AND.
					 */
					and?: Array<RuleSetConditionWebpackOptions>;
					/**
					 * Logical NOT.
					 */
					not?: Array<RuleSetConditionWebpackOptions>;
					/**
					 * Logical OR.
					 */
					or?: Array<RuleSetConditionWebpackOptions>;
			  }
			| ((value: string) => boolean)
			| Array<RuleSetConditionWebpackOptions>;

		/**
		 * Enforce this rule as pre or post step.
		 */
		enforce?: "pre" | "post";

		/**
		 * Shortcut for resource.exclude.
		 */
		exclude?:
			| string
			| RegExp
			| {
					/**
					 * Logical AND.
					 */
					and?: Array<RuleSetConditionAbsoluteWebpackOptions>;
					/**
					 * Logical NOT.
					 */
					not?: Array<RuleSetConditionAbsoluteWebpackOptions>;
					/**
					 * Logical OR.
					 */
					or?: Array<RuleSetConditionAbsoluteWebpackOptions>;
			  }
			| ((value: string) => boolean)
			| Array<RuleSetConditionAbsoluteWebpackOptions>;

		/**
		 * The options for the module generator.
		 */
		generator?: { [index: string]: any };

		/**
		 * Shortcut for resource.include.
		 */
		include?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Match the issuer of the module (The module pointing to this module).
		 */
		issuer?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Shortcut for use.loader.
		 */
		loader?: string;

		/**
		 * Only execute the first matching rule in this array.
		 */
		oneOf?: Array<internals.RuleSetRule>;

		/**
		 * Shortcut for use.options.
		 */
		options?: string | { [index: string]: any };

		/**
		 * Options for parsing.
		 */
		parser?: { [index: string]: any };

		/**
		 * Match the real resource path of the module.
		 */
		realResource?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Options for the resolver.
		 */
		resolve?: internals.ResolveOptions;

		/**
		 * Match the resource path of the module.
		 */
		resource?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Match the resource query of the module.
		 */
		resourceQuery?: RuleSetConditionWebpackOptions;

		/**
		 * Match and execute these rules when this rule is matched.
		 */
		rules?: Array<internals.RuleSetRule>;

		/**
		 * Flags a module as with or without side effects.
		 */
		sideEffects?: boolean;

		/**
		 * Shortcut for resource.test.
		 */
		test?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Module type to use for the module.
		 */
		type?: string;

		/**
		 * Modifiers applied to the module when rule is matched.
		 */
		use?:
			| string
			| Array<
					| string
					| {
							/**
							 * Unique loader options identifier.
							 */
							ident?: string;
							/**
							 * Loader name.
							 */
							loader?: string;
							/**
							 * Loader options.
							 */
							options?: string | { [index: string]: any };
					  }
					| ((data: {}) =>
							| string
							| {
									/**
									 * Unique loader options identifier.
									 */
									ident?: string;
									/**
									 * Loader name.
									 */
									loader?: string;
									/**
									 * Loader options.
									 */
									options?: string | { [index: string]: any };
							  }
							| __TypeWebpackOptions
							| Array<RuleSetUseItemWebpackOptions>)
			  >
			| ((data: {}) => Array<RuleSetUseItemWebpackOptions>)
			| {
					/**
					 * Unique loader options identifier.
					 */
					ident?: string;
					/**
					 * Loader name.
					 */
					loader?: string;
					/**
					 * Loader options.
					 */
					options?: string | { [index: string]: any };
			  }
			| __TypeWebpackOptions;
	}
	export type RuleSetUse =
		| string
		| Array<
				| string
				| {
						/**
						 * Unique loader options identifier.
						 */
						ident?: string;
						/**
						 * Loader name.
						 */
						loader?: string;
						/**
						 * Loader options.
						 */
						options?: string | { [index: string]: any };
				  }
				| ((data: {}) =>
						| string
						| {
								/**
								 * Unique loader options identifier.
								 */
								ident?: string;
								/**
								 * Loader name.
								 */
								loader?: string;
								/**
								 * Loader options.
								 */
								options?: string | { [index: string]: any };
						  }
						| __TypeWebpackOptions
						| Array<RuleSetUseItemWebpackOptions>)
		  >
		| ((data: {}) => Array<RuleSetUseItemWebpackOptions>)
		| {
				/**
				 * Unique loader options identifier.
				 */
				ident?: string;
				/**
				 * Loader name.
				 */
				loader?: string;
				/**
				 * Loader options.
				 */
				options?: string | { [index: string]: any };
		  }
		| __TypeWebpackOptions;
	export type RuleSetUseItem =
		| string
		| {
				/**
				 * Unique loader options identifier.
				 */
				ident?: string;
				/**
				 * Loader name.
				 */
				loader?: string;
				/**
				 * Loader options.
				 */
				options?: string | { [index: string]: any };
		  }
		| __TypeWebpackOptions;
	type RuleSetUseItemWebpackOptions =
		| string
		| {
				/**
				 * Unique loader options identifier.
				 */
				ident?: string;
				/**
				 * Loader name.
				 */
				loader?: string;
				/**
				 * Loader options.
				 */
				options?: string | { [index: string]: any };
		  }
		| ((data: {}) =>
				| string
				| {
						/**
						 * Unique loader options identifier.
						 */
						ident?: string;
						/**
						 * Loader name.
						 */
						loader?: string;
						/**
						 * Loader options.
						 */
						options?: string | { [index: string]: any };
				  }
				| __TypeWebpackOptions
				| Array<RuleSetUseItemWebpackOptions>);
	export type RulesBannerPlugin = string | RegExp | Array<string | RegExp>;
	export type RulesSourceMapDevToolPlugin =
		| string
		| RegExp
		| Array<string | RegExp>;
	export class RuntimeChunkPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export namespace RuntimeGlobals {
		export let require: string;
		export let requireScope: string;
		export let exports: string;
		export let thisAsExports: string;
		export let returnExportsFromRuntime: string;
		export let module: string;
		export let moduleId: string;
		export let moduleLoaded: string;
		export let publicPath: string;
		export let entryModuleId: string;
		export let moduleCache: string;
		export let moduleFactories: string;
		export let moduleFactoriesAddOnly: string;
		export let ensureChunk: string;
		export let ensureChunkHandlers: string;
		export let ensureChunkIncludeEntries: string;
		export let prefetchChunk: string;
		export let prefetchChunkHandlers: string;
		export let preloadChunk: string;
		export let preloadChunkHandlers: string;
		export let definePropertyGetters: string;
		export let makeNamespaceObject: string;
		export let createFakeNamespaceObject: string;
		export let compatGetDefaultExport: string;
		export let harmonyModuleDecorator: string;
		export let nodeModuleDecorator: string;
		export let getFullHash: string;
		export let wasmInstances: string;
		export let instantiateWasm: string;
		export let uncaughtErrorHandler: string;
		export let scriptNonce: string;
		export let chunkName: string;
		export let getChunkScriptFilename: string;
		export let getChunkUpdateScriptFilename: string;
		export let startup: string;
		export let startupNoDefault: string;
		export let interceptModuleExecution: string;
		export let global: string;
		export let getUpdateManifestFilename: string;
		export let hmrDownloadManifest: string;
		export let hmrDownloadUpdateHandlers: string;
		export let hmrModuleData: string;
		export let hmrInvalidateModuleHandlers: string;
		export let amdDefine: string;
		export let amdOptions: string;
		export let system: string;
		export let hasOwnProperty: string;
		export let systemContext: string;
	}
	export class RuntimeModule extends internals.Module {
		constructor(name: string, stage?: number);
		name: string;
		stage: number;
		compilation: internals.Compilation;
		chunk: internals.Chunk;
		attach(compilation: internals.Compilation, chunk: internals.Chunk): void;
		generate(): string;
		getGeneratedCode(): string;
	}
	export abstract class RuntimeTemplate {
		outputOptions: internals.Output;
		requestShortener: internals.RequestShortener;
		isIIFE(): boolean;
		supportsConst(): boolean;
		supportsArrowFunction(): boolean;
		supportsForOf(): boolean;
		returningFunction(returnValue?: any, args?: string): string;
		basicFunction(args?: any, body?: any): string;
		iife(args?: any, body?: any): string;
		forEach(variable?: any, array?: any, body?: any): string;

		/**
		 * Add a comment
		 */
		comment(__0: {
			/**
			 * request string used originally
			 */
			request?: string;
			/**
			 * name of the chunk referenced
			 */
			chunkName?: string;
			/**
			 * reason information of the chunk
			 */
			chunkReason?: string;
			/**
			 * additional message
			 */
			message?: string;
			/**
			 * name of the export
			 */
			exportName?: string;
		}): string;
		throwMissingModuleErrorBlock(__0: {
			/**
			 * request string used originally
			 */
			request?: string;
		}): string;
		throwMissingModuleErrorFunction(__0: {
			/**
			 * request string used originally
			 */
			request?: string;
		}): string;
		missingModule(__0: {
			/**
			 * request string used originally
			 */
			request?: string;
		}): string;
		missingModuleStatement(__0: {
			/**
			 * request string used originally
			 */
			request?: string;
		}): string;
		missingModulePromise(__0: {
			/**
			 * request string used originally
			 */
			request?: string;
		}): string;
		weakError(__0: {
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * expression to use as id expression
			 */
			idExpr?: string;
			/**
			 * which kind of code should be returned
			 */
			type: "expression" | "promise" | "statements";
		}): string;
		moduleId(__0: {
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * if the dependency is weak (will create a nice error message)
			 */
			weak?: boolean;
		}): string;
		moduleRaw(__0: {
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * if the dependency is weak (will create a nice error message)
			 */
			weak?: boolean;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		moduleExports(__0: {
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * if the dependency is weak (will create a nice error message)
			 */
			weak?: boolean;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		moduleNamespace(__0: {
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * if the current module is in strict esm mode
			 */
			strict?: boolean;
			/**
			 * if the dependency is weak (will create a nice error message)
			 */
			weak?: boolean;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		moduleNamespacePromise(__0: {
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the current dependencies block
			 */
			block?: internals.AsyncDependenciesBlock;
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * a message for the comment
			 */
			message: string;
			/**
			 * if the current module is in strict esm mode
			 */
			strict?: boolean;
			/**
			 * if the dependency is weak (will create a nice error message)
			 */
			weak?: boolean;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		importStatement(__0: {
			/**
			 * whether a new variable should be created or the existing one updated
			 */
			update?: boolean;
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * the request that should be printed as comment
			 */
			request: string;
			/**
			 * name of the import variable
			 */
			importVar: string;
			/**
			 * module in which the statement is emitted
			 */
			originModule: internals.Module;
			/**
			 * true, if this is a weak dependency
			 */
			weak?: boolean;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		exportFromImport(__0: {
			/**
			 * the module graph
			 */
			moduleGraph: internals.ModuleGraph;
			/**
			 * the module
			 */
			module: internals.Module;
			/**
			 * the request
			 */
			request: string;
			/**
			 * the export name
			 */
			exportName: string | Array<string>;
			/**
			 * the origin module
			 */
			originModule: internals.Module;
			/**
			 * true, if location is safe for ASI, a bracket can be emitted
			 */
			asiSafe: boolean;
			/**
			 * true, if expression will be called
			 */
			isCall: boolean;
			/**
			 * when false, call context will not be preserved
			 */
			callContext: boolean;
			/**
			 * when true and accessing the default exports, interop code will be generated
			 */
			defaultInterop: boolean;
			/**
			 * the identifier name of the import variable
			 */
			importVar: string;
			/**
			 * init fragments will be added here
			 */
			initFragments: Array<internals.InitFragment>;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		blockPromise(__0: {
			/**
			 * the async block
			 */
			block: internals.AsyncDependenciesBlock;
			/**
			 * the message
			 */
			message: string;
			/**
			 * the chunk graph
			 */
			chunkGraph: internals.ChunkGraph;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		defineEsModuleFlagStatement(__0: {
			/**
			 * the name of the exports object
			 */
			exportsArgument: string;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
	}
	export abstract class RuntimeValue {
		fn: any;
		fileDependencies: any;
		exec(parser?: any): any;
	}
	export const SKIP_OVER_NAME: unique symbol;
	export interface ScopeInfo {
		definitions: internals.StackedMap<
			string,
			internals.ScopeInfo | internals.VariableInfo
		>;
		topLevelScope: boolean | "arrow";
		inShorthand: boolean;
		isStrict: boolean;
		isAsmJs: boolean;
		inTry: boolean;
	}
	export abstract class Serializer {
		serializeMiddlewares: any;
		deserializeMiddlewares: any;
		context: any;
		serialize(obj?: any, context?: any): any;
		deserialize(value?: any, context?: any): any;
	}
	export class SideEffectsFlagPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
		static moduleHasSideEffects(
			moduleName?: any,
			flagValue?: any,
			cache?: any
		): any;
	}

	/**
	 * istanbul ignore next
	 */
	export interface Snapshot {
		startTime?: number;
		fileTimestamps?: Map<string, internals.FileSystemInfoEntry>;
		fileHashes?: Map<string, string>;
		contextTimestamps?: Map<string, internals.FileSystemInfoEntry>;
		contextHashes?: Map<string, string>;
		missingExistence?: Map<string, boolean>;
		managedItemInfo?: Map<string, string>;
		children?: Set<internals.Snapshot>;
	}
	export abstract class SortableSet<T> extends Set<T> {
		/**
		 * Sort with a comparer function
		 */
		sortWith(sortFn: (arg0: T, arg1: T) => number): void;
		sort(): void;

		/**
		 * Get data from cache
		 */
		getFromCache<R>(fn: (arg0: internals.SortableSet<T>) => R): R;

		/**
		 * Get data from cache (ignoring sorting)
		 */
		getFromUnorderedCache<R>(fn: (arg0: internals.SortableSet<T>) => R): R;
		toJSON(): Array<T>;
	}
	export abstract class Source {
		size(): number;
		map(options: internals.MapOptions): Object;
		sourceAndMap(
			options: internals.MapOptions
		): { source: string | Buffer; map: Object };
		updateHash(hash: internals.Hash): void;
		source(): string | Buffer;
		buffer(): Buffer;
	}
	export interface SourceContext {
		/**
		 * the dependency templates
		 */
		dependencyTemplates: internals.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: internals.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: internals.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: internals.ChunkGraph;

		/**
		 * the type of source that should be generated
		 */
		type?: string;
	}
	export class SourceMapDevToolPlugin {
		constructor(options?: internals.SourceMapDevToolPluginOptions);
		sourceMapFilename: string | false;
		sourceMappingURLComment: string | false;
		moduleFilenameTemplate: string | Function;
		fallbackModuleFilenameTemplate: string | Function;
		namespace: string;
		options: internals.SourceMapDevToolPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface SourceMapDevToolPluginOptions {
		/**
		 * Appends the given value to the original asset. Usually the #sourceMappingURL comment. [url] is replaced with a URL to the source map file. false disables the appending.
		 */
		append?: string | false;

		/**
		 * Indicates whether column mappings should be used (defaults to true).
		 */
		columns?: boolean;

		/**
		 * Exclude modules that match the given value from source map generation.
		 */
		exclude?: string | RegExp | Array<string | RegExp>;

		/**
		 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap used only if 'moduleFilenameTemplate' would result in a conflict.
		 */
		fallbackModuleFilenameTemplate?: string | Function;

		/**
		 * Path prefix to which the [file] placeholder is relative to.
		 */
		fileContext?: string;

		/**
		 * Defines the output filename of the SourceMap (will be inlined if no value is provided).
		 */
		filename?: string | false;

		/**
		 * Include source maps for module paths that match the given value.
		 */
		include?: string | RegExp | Array<string | RegExp>;

		/**
		 * Indicates whether SourceMaps from loaders should be used (defaults to true).
		 */
		module?: boolean;

		/**
		 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap.
		 */
		moduleFilenameTemplate?: string | Function;

		/**
		 * Namespace prefix to allow multiple webpack roots in the devtools.
		 */
		namespace?: string;

		/**
		 * Omit the 'sourceContents' array from the SourceMap.
		 */
		noSources?: boolean;

		/**
		 * Provide a custom public path for the SourceMapping comment.
		 */
		publicPath?: string;

		/**
		 * Provide a custom value for the 'sourceRoot' property in the SourceMap.
		 */
		sourceRoot?: string;

		/**
		 * Include source maps for modules based on their extension (defaults to .js and .css).
		 */
		test?: string | RegExp | Array<string | RegExp>;
	}
	export interface SourcePosition {
		line: number;
		column?: number;
	}
	export interface SplitChunksOptions {
		chunksFilter: (chunk: internals.Chunk) => boolean;
		minSize: Record<string, number>;
		minRemainingSize: Record<string, number>;
		maxInitialSize: Record<string, number>;
		maxAsyncSize: Record<string, number>;
		minChunks: number;
		maxAsyncRequests: number;
		maxInitialRequests: number;
		hidePathInfo: boolean;
		filename:
			| string
			| ((arg0: internals.PathData, arg1: internals.AssetInfo) => string);
		automaticNameDelimiter: string;
		getCacheGroups: (
			module: internals.Module,
			context: internals.CacheGroupsContext
		) => Array<internals.CacheGroupSource>;
		getName: (
			module?: internals.Module,
			chunks?: Array<internals.Chunk>,
			key?: string
		) => string;
		fallbackCacheGroup: internals.FallbackCacheGroup;
	}
	export class SplitChunksPlugin {
		constructor(options?: internals.OptimizationSplitChunksOptions);
		options: internals.SplitChunksOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export abstract class StackedMap<K, V> {
		map: Map<
			K,
			V | typeof internals.TOMBSTONE | typeof internals.UNDEFINED_MARKER
		>;
		stack: Array<
			Map<K, V | typeof internals.TOMBSTONE | typeof internals.UNDEFINED_MARKER>
		>;
		set(item: K, value: V): void;
		delete(item: K): void;
		has(item: K): boolean;
		get(item: K): V;
		asArray(): Array<K>;
		asSet(): Set<K>;
		asPairArray(): Array<[K, V]>;
		asMap(): Map<K, V>;
		readonly size: number;
		createChild(): internals.StackedMap<K, V>;
	}
	export type Statement =
		| ExpressionStatement
		| BlockStatement
		| EmptyStatement
		| DebuggerStatement
		| WithStatement
		| ReturnStatement
		| LabeledStatement
		| BreakStatement
		| ContinueStatement
		| IfStatement
		| SwitchStatement
		| ThrowStatement
		| TryStatement
		| WhileStatement
		| DoWhileStatement
		| ForStatement
		| ForInStatement
		| ForOfStatement
		| FunctionDeclaration
		| VariableDeclaration
		| ClassDeclaration;
	export class Stats {
		constructor(compilation: internals.Compilation);
		compilation: internals.Compilation;
		hash: string;
		startTime: any;
		endTime: any;
		hasWarnings(): boolean;
		hasErrors(): boolean;
		toJson(options?: any): any;
		toString(options?: any): any;
	}
	export abstract class StatsFactory {
		hooks: Readonly<{
			extract: HookMap<SyncBailHook<[any, any, any], any>>;
			filter: HookMap<SyncBailHook<[any, any, number, number], any>>;
			sort: HookMap<
				SyncBailHook<[Array<(arg0?: any, arg1?: any) => number>, any], any>
			>;
			filterSorted: HookMap<SyncBailHook<[any, any, number, number], any>>;
			sortResults: HookMap<
				SyncBailHook<[Array<(arg0?: any, arg1?: any) => number>, any], any>
			>;
			filterResults: HookMap<SyncBailHook<any, any>>;
			merge: HookMap<SyncBailHook<[Array<any>, any], any>>;
			result: HookMap<SyncBailHook<[Array<any>, any], any>>;
			getItemName: HookMap<SyncBailHook<[any, any], any>>;
			getItemFactory: HookMap<SyncBailHook<[any, any], any>>;
		}>;
		create(type?: any, data?: any, baseContext?: any): any;
	}

	/**
	 * Stats options object.
	 */
	export interface StatsOptions {
		/**
		 * Fallback value for stats options when an option is not defined (has precedence over local webpack defaults).
		 */
		all?: boolean;

		/**
		 * Add assets information.
		 */
		assets?: boolean;

		/**
		 * Sort the assets by that field.
		 */
		assetsSort?: string;

		/**
		 * Add built at time information.
		 */
		builtAt?: boolean;

		/**
		 * Add information about cached (not built) modules.
		 */
		cached?: boolean;

		/**
		 * Show cached assets (setting this to `false` only shows emitted files).
		 */
		cachedAssets?: boolean;

		/**
		 * Add children information.
		 */
		children?: boolean;

		/**
		 * Display all chunk groups with the corresponding bundles.
		 */
		chunkGroups?: boolean;

		/**
		 * Add built modules information to chunk information.
		 */
		chunkModules?: boolean;

		/**
		 * Add the origins of chunks and chunk merging info.
		 */
		chunkOrigins?: boolean;

		/**
		 * Add information about parent, children and sibling chunks to chunk information.
		 */
		chunkRelations?: boolean;

		/**
		 * Add root modules information to chunk information.
		 */
		chunkRootModules?: boolean;

		/**
		 * Add chunk information.
		 */
		chunks?: boolean;

		/**
		 * Sort the chunks by that field.
		 */
		chunksSort?: string;

		/**
		 * Enables/Disables colorful output.
		 */
		colors?:
			| boolean
			| {
					/**
					 * Custom color for bold text.
					 */
					bold?: string;
					/**
					 * Custom color for cyan text.
					 */
					cyan?: string;
					/**
					 * Custom color for green text.
					 */
					green?: string;
					/**
					 * Custom color for magenta text.
					 */
					magenta?: string;
					/**
					 * Custom color for red text.
					 */
					red?: string;
					/**
					 * Custom color for yellow text.
					 */
					yellow?: string;
			  };

		/**
		 * Context directory for request shortening.
		 */
		context?: string;

		/**
		 * Add module depth in module graph.
		 */
		depth?: boolean;

		/**
		 * Display the entry points with the corresponding bundles.
		 */
		entrypoints?: boolean;

		/**
		 * Add --env information.
		 */
		env?: boolean;

		/**
		 * Add details to errors (like resolving log).
		 */
		errorDetails?: boolean;

		/**
		 * Add internal stack trace to errors.
		 */
		errorStack?: boolean;

		/**
		 * Add errors.
		 */
		errors?: boolean;

		/**
		 * Please use excludeModules instead.
		 */
		exclude?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions.
		 */
		excludeAssets?:
			| string
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions.
		 */
		excludeModules?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Add the hash of the compilation.
		 */
		hash?: boolean;

		/**
		 * Add ids.
		 */
		ids?: boolean;

		/**
		 * Add logging output.
		 */
		logging?: boolean | "none" | "verbose" | "error" | "warn" | "info" | "log";

		/**
		 * Include debug logging of specified loggers (i. e. for plugins or loaders). Filters can be Strings, RegExps or Functions.
		 */
		loggingDebug?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Add stack traces to logging output.
		 */
		loggingTrace?: boolean;

		/**
		 * Set the maximum number of modules to be shown.
		 */
		maxModules?: number;

		/**
		 * Add information about assets inside modules.
		 */
		moduleAssets?: boolean;

		/**
		 * Add dependencies and origin of warnings/errors.
		 */
		moduleTrace?: boolean;

		/**
		 * Add built modules information.
		 */
		modules?: boolean;

		/**
		 * Sort the modules by that field.
		 */
		modulesSort?: string;

		/**
		 * Add information about modules nested in other modules (like with module concatenation).
		 */
		nestedModules?: boolean;

		/**
		 * Show reasons why optimization bailed out for modules.
		 */
		optimizationBailout?: boolean;

		/**
		 * Add information about orphan modules.
		 */
		orphanModules?: boolean;

		/**
		 * Add output path information.
		 */
		outputPath?: boolean;

		/**
		 * Add performance hint flags.
		 */
		performance?: boolean;

		/**
		 * Preset for the default values.
		 */
		preset?: string | boolean;

		/**
		 * Show exports provided by modules.
		 */
		providedExports?: boolean;

		/**
		 * Add public path information.
		 */
		publicPath?: boolean;

		/**
		 * Add information about the reasons why modules are included.
		 */
		reasons?: boolean;

		/**
		 * Add information about runtime modules.
		 */
		runtime?: boolean;

		/**
		 * Add the source code of modules.
		 */
		source?: boolean;

		/**
		 * Add timing information.
		 */
		timings?: boolean;

		/**
		 * Show exports used by modules.
		 */
		usedExports?: boolean;

		/**
		 * Add webpack version information.
		 */
		version?: boolean;

		/**
		 * Add warnings.
		 */
		warnings?: boolean;

		/**
		 * Suppress warnings that match the specified filters. Filters can be Strings, RegExps or Functions.
		 */
		warningsFilter?:
			| string
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);
	}
	export abstract class StatsPrinter {
		hooks: Readonly<{
			sortElements: HookMap<SyncBailHook<[Array<string>, any], any>>;
			printElements: HookMap<
				SyncBailHook<[Array<internals.PrintedElement>, any], any>
			>;
			sortItems: HookMap<SyncBailHook<[Array<any>, any], any>>;
			getItemName: HookMap<SyncBailHook<[any, any], any>>;
			printItems: HookMap<SyncBailHook<[Array<string>, any], any>>;
			print: HookMap<SyncBailHook<[any, any], any>>;
			result: HookMap<SyncWaterfallHook<[string, any]>>;
		}>;
		print(type?: any, object?: any, baseContext?: any): any;
	}
	export type StatsValue =
		| boolean
		| "none"
		| "errors-only"
		| "minimal"
		| "normal"
		| "detailed"
		| "verbose"
		| "errors-warnings"
		| internals.StatsOptions;
	export interface SyntheticDependencyLocation {
		name: string;
		index?: number;
	}
	export const TOMBSTONE: unique symbol;
	export interface TagInfo {
		tag: any;
		data: any;
		next: internals.TagInfo;
	}
	export type Target =
		| "web"
		| "webworker"
		| "node"
		| "async-node"
		| "node-webkit"
		| "electron-main"
		| "electron-renderer"
		| "electron-preload"
		| ((compiler: internals.Compiler) => void);
	export class Template {
		constructor();
		static getFunctionContent(fn: Function): string;
		static toIdentifier(str: string): string;
		static toComment(str: string): string;
		static toNormalComment(str: string): string;
		static toPath(str: string): string;
		static numberToIdentifier(n: number): string;
		static numberToIdentifierContinuation(n: number): string;
		static indent(s: string | Array<string>): string;
		static prefix(s: string | Array<string>, prefix: string): string;
		static asString(str: string | Array<string>): string;
		static getModulesArrayBounds(
			modules: Array<internals.WithId>
		): false | [number, number];
		static renderChunkModules(
			renderContext: internals.RenderContextModuleTemplate,
			modules: Array<internals.Module>,
			renderModule: (arg0: internals.Module) => internals.Source,
			prefix?: string
		): internals.Source;
		static renderRuntimeModules(
			runtimeModules: Array<internals.RuntimeModule>,
			renderContext: internals.RenderContextModuleTemplate
		): internals.Source;
		static renderChunkRuntimeModules(
			runtimeModules: Array<internals.RuntimeModule>,
			renderContext: internals.RenderContextModuleTemplate
		): internals.Source;
		static NUMBER_OF_IDENTIFIER_START_CHARS: number;
		static NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS: number;
	}
	export const UNDEFINED_MARKER: unique symbol;
	export interface UpdateHashContext {
		/**
		 * the module
		 */
		module: internals.NormalModule;

		/**
		 * the compilation
		 */
		compilation: internals.Compilation;
	}
	export abstract class VariableInfo {
		declaredScope: internals.ScopeInfo;
		freeName: string | true;
		tagInfo: internals.TagInfo;
	}
	export class WatchIgnorePlugin {
		constructor(options: internals.WatchIgnorePluginOptions);
		paths: [string | RegExp, string | RegExp];

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface WatchIgnorePluginOptions {
		/**
		 * A list of RegExps or absolute paths to directories or files that should be ignored.
		 */
		paths: [string | RegExp, string | RegExp];
	}

	/**
	 * Options for the watcher.
	 */
	export interface WatchOptions {
		/**
		 * Delay the rebuilt after the first change. Value is a time in ms.
		 */
		aggregateTimeout?: number;

		/**
		 * Ignore some files from watching (glob pattern).
		 */
		ignored?: string | Array<string>;

		/**
		 * Enable polling mode for watching.
		 */
		poll?: number | boolean;

		/**
		 * Stop watching when stdin stream has ended.
		 */
		stdin?: boolean;
	}
	export abstract class Watching {
		startTime: number;
		invalid: boolean;
		handler: internals.CallbackCompiler<internals.Stats>;
		callbacks: Array<internals.CallbackCompiler<void>>;
		closed: boolean;
		suspended: boolean;
		watchOptions: {
			/**
			 * Delay the rebuilt after the first change. Value is a time in ms.
			 */
			aggregateTimeout?: number;
			/**
			 * Ignore some files from watching (glob pattern).
			 */
			ignored?: string | Array<string>;
			/**
			 * Enable polling mode for watching.
			 */
			poll?: number | boolean;
			/**
			 * Stop watching when stdin stream has ended.
			 */
			stdin?: boolean;
		};
		compiler: internals.Compiler;
		running: boolean;
		watcher: any;
		pausedWatcher: any;
		watch(
			files: Iterable<string>,
			dirs: Iterable<string>,
			missing: Iterable<string>
		): void;
		invalidate(callback: internals.CallbackCompiler<void>): void;
		suspend(): void;
		resume(): void;
		close(callback: internals.CallbackCompiler<void>): void;
	}
	export class WebWorkerTemplatePlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: internals.Compiler): void;
	}
	export interface WebpackError extends Error {
		details: any;
		module: internals.Module;
		loc:
			| internals.SyntheticDependencyLocation
			| internals.RealDependencyLocation;
		hideStack: boolean;
		chunk: internals.Chunk;
		file: string;
		serialize(__0: { write: any }): void;
		deserialize(__0: { read: any }): void;
	}
	export abstract class WebpackLogger {
		getChildLogger: (arg0: string | (() => string)) => internals.WebpackLogger;
		error(...args: Array<any>): void;
		warn(...args: Array<any>): void;
		info(...args: Array<any>): void;
		log(...args: Array<any>): void;
		debug(...args: Array<any>): void;
		assert(assertion: any, ...args: Array<any>): void;
		trace(): void;
		clear(): void;
		status(...args: Array<any>): void;
		group(...args: Array<any>): void;
		groupCollapsed(...args: Array<any>): void;
		groupEnd(...args: Array<any>): void;
		profile(label?: any): void;
		profileEnd(label?: any): void;
		time(label?: any): void;
		timeLog(label?: any): void;
		timeEnd(label?: any): void;
		timeAggregate(label?: any): void;
		timeAggregateEnd(label?: any): void;
	}

	/**
	 * Options object as provided by the user.
	 */
	export interface WebpackOptions {
		/**
		 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
		 */
		amd?: false | { [index: string]: any };

		/**
		 * Report the first error as a hard error instead of tolerating it.
		 */
		bail?: boolean;

		/**
		 * Cache generated modules and chunks to improve performance for multiple incremental builds.
		 */
		cache?: boolean | internals.MemoryCacheOptions | internals.FileCacheOptions;

		/**
		 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
		 */
		context?: string;

		/**
		 * References to other configurations to depend on.
		 */
		dependencies?: Array<string>;

		/**
		 * Options for the webpack-dev-server.
		 */
		devServer?: internals.DevServer;

		/**
		 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
		 */
		devtool?: string | false;

		/**
		 * The entry point(s) of the compilation.
		 */
		entry?:
			| string
			| (() =>
					| string
					| internals.EntryObject
					| [string, string]
					| Promise<string | internals.EntryObject | [string, string]>)
			| internals.EntryObject
			| [string, string];

		/**
		 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
		 */
		experiments?: internals.Experiments;

		/**
		 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
		 */
		externals?:
			| string
			| RegExp
			| Array<
					| string
					| RegExp
					| {
							[index: string]:
								| string
								| boolean
								| Array<string>
								| { [index: string]: any };
					  }
					| ((
							context: string,
							request: string,
							callback: (err: Error, result: string) => void
					  ) => void)
			  >
			| {
					[index: string]:
						| string
						| boolean
						| Array<string>
						| { [index: string]: any };
			  }
			| ((
					context: string,
					request: string,
					callback: (err: Error, result: string) => void
			  ) => void);

		/**
		 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
		 */
		externalsType?:
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system";

		/**
		 * Options for infrastructure level logging.
		 */
		infrastructureLogging?: internals.InfrastructureLogging;

		/**
		 * Custom values available in the loader context.
		 */
		loader?: internals.Loader;

		/**
		 * Enable production optimizations or development hints.
		 */
		mode?: "development" | "production" | "none";

		/**
		 * Options affecting the normal modules (`NormalModuleFactory`).
		 */
		module?: internals.ModuleOptions;

		/**
		 * Name of the configuration. Used when loading multiple configurations.
		 */
		name?: string;

		/**
		 * Include polyfills or mocks for various node stuff.
		 */
		node?: false | internals.NodeOptions;

		/**
		 * Enables/Disables integrated optimizations.
		 */
		optimization?: internals.Optimization;

		/**
		 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
		 */
		output?: internals.Output;

		/**
		 * The number of parallel processed modules in the compilation.
		 */
		parallelism?: number;

		/**
		 * Configuration for web performance recommendations.
		 */
		performance?: false | internals.PerformanceOptions;

		/**
		 * Add additional plugins to the compiler.
		 */
		plugins?: Array<
			internals.WebpackPluginInstance | ((compiler: internals.Compiler) => void)
		>;

		/**
		 * Capture timing information for each module.
		 */
		profile?: boolean;

		/**
		 * Store compiler state to a json file.
		 */
		recordsInputPath?: string | false;

		/**
		 * Load compiler state from a json file.
		 */
		recordsOutputPath?: string | false;

		/**
		 * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
		 */
		recordsPath?: string | false;

		/**
		 * Options for the resolver.
		 */
		resolve?: internals.ResolveOptions;

		/**
		 * Options for the resolver when resolving loaders.
		 */
		resolveLoader?: internals.ResolveOptions;

		/**
		 * Stats options object or preset name.
		 */
		stats?:
			| boolean
			| "none"
			| "errors-only"
			| "minimal"
			| "normal"
			| "detailed"
			| "verbose"
			| "errors-warnings"
			| internals.StatsOptions;

		/**
		 * Environment to build for.
		 */
		target?:
			| "web"
			| "webworker"
			| "node"
			| "async-node"
			| "node-webkit"
			| "electron-main"
			| "electron-renderer"
			| "electron-preload"
			| ((compiler: internals.Compiler) => void);

		/**
		 * Enter watch mode, which rebuilds on file change.
		 */
		watch?: boolean;

		/**
		 * Options for the watcher.
		 */
		watchOptions?: internals.WatchOptions;
	}
	export class WebpackOptionsApply extends internals.OptionsApply {
		constructor();
	}
	export class WebpackOptionsDefaulter {
		constructor();
		process(options?: any): any;
	}

	/**
	 * Normalized webpack options object.
	 */
	export interface WebpackOptionsNormalized {
		/**
		 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
		 */
		amd?: false | { [index: string]: any };

		/**
		 * Report the first error as a hard error instead of tolerating it.
		 */
		bail?: boolean;

		/**
		 * Cache generated modules and chunks to improve performance for multiple incremental builds.
		 */
		cache: false | internals.MemoryCacheOptions | internals.FileCacheOptions;

		/**
		 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
		 */
		context?: string;

		/**
		 * References to other configurations to depend on.
		 */
		dependencies?: Array<string>;

		/**
		 * Options for the webpack-dev-server.
		 */
		devServer?: internals.DevServer;

		/**
		 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
		 */
		devtool?: string | false;

		/**
		 * The entry point(s) of the compilation.
		 */
		entry:
			| (() => Promise<internals.EntryStaticNormalized>)
			| internals.EntryStaticNormalized;

		/**
		 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
		 */
		experiments: internals.Experiments;

		/**
		 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
		 */
		externals:
			| string
			| RegExp
			| Array<
					| string
					| RegExp
					| {
							[index: string]:
								| string
								| boolean
								| Array<string>
								| { [index: string]: any };
					  }
					| ((
							context: string,
							request: string,
							callback: (err: Error, result: string) => void
					  ) => void)
			  >
			| {
					[index: string]:
						| string
						| boolean
						| Array<string>
						| { [index: string]: any };
			  }
			| ((
					context: string,
					request: string,
					callback: (err: Error, result: string) => void
			  ) => void);

		/**
		 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
		 */
		externalsType?:
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system";

		/**
		 * Options for infrastructure level logging.
		 */
		infrastructureLogging: internals.InfrastructureLogging;

		/**
		 * Custom values available in the loader context.
		 */
		loader?: internals.Loader;

		/**
		 * Enable production optimizations or development hints.
		 */
		mode?: "development" | "production" | "none";

		/**
		 * Options affecting the normal modules (`NormalModuleFactory`).
		 */
		module: internals.ModuleOptions;

		/**
		 * Name of the configuration. Used when loading multiple configurations.
		 */
		name?: string;

		/**
		 * Include polyfills or mocks for various node stuff.
		 */
		node: false | internals.NodeOptions;

		/**
		 * Enables/Disables integrated optimizations.
		 */
		optimization: internals.Optimization;

		/**
		 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
		 */
		output: internals.OutputNormalized;

		/**
		 * The number of parallel processed modules in the compilation.
		 */
		parallelism?: number;

		/**
		 * Configuration for web performance recommendations.
		 */
		performance?: false | internals.PerformanceOptions;

		/**
		 * Add additional plugins to the compiler.
		 */
		plugins: Array<
			internals.WebpackPluginInstance | ((compiler: internals.Compiler) => void)
		>;

		/**
		 * Capture timing information for each module.
		 */
		profile?: boolean;

		/**
		 * Store compiler state to a json file.
		 */
		recordsInputPath?: string | false;

		/**
		 * Load compiler state from a json file.
		 */
		recordsOutputPath?: string | false;

		/**
		 * Options for the resolver.
		 */
		resolve: internals.ResolveOptions;

		/**
		 * Options for the resolver when resolving loaders.
		 */
		resolveLoader: internals.ResolveOptions;

		/**
		 * Stats options object or preset name.
		 */
		stats:
			| boolean
			| "none"
			| "errors-only"
			| "minimal"
			| "normal"
			| "detailed"
			| "verbose"
			| "errors-warnings"
			| internals.StatsOptions;

		/**
		 * Environment to build for.
		 */
		target?:
			| "web"
			| "webworker"
			| "node"
			| "async-node"
			| "node-webkit"
			| "electron-main"
			| "electron-renderer"
			| "electron-preload"
			| ((compiler: internals.Compiler) => void);

		/**
		 * Enter watch mode, which rebuilds on file change.
		 */
		watch?: boolean;

		/**
		 * Options for the watcher.
		 */
		watchOptions: internals.WatchOptions;
	}

	/**
	 * Plugin instance.
	 */
	export interface WebpackPluginInstance {
		[index: string]: any;

		/**
		 * The run point of the plugin, required method.
		 */
		apply: (compiler: internals.Compiler) => void;
	}
	export interface WithId {
		id: string | number;
	}
	export interface WithOptions {
		/**
		 * create a resolver with additional/different options
		 */
		withOptions: (arg0?: any) => internals.Resolver & internals.WithOptions;
	}
	export interface WriteOnlySet<T> {
		add(item: T): void;
	}
	export namespace __TypeLibIndex {
		export let webpack: (
			options: internals.WebpackOptions | Array<internals.WebpackOptions>,
			callback: internals.CallbackWebpack<
				internals.Stats | internals.MultiStats
			>
		) => internals.Compiler | internals.MultiCompiler;
		export let validate: any;
		export let validateSchema: (schema?: any, options?: any) => void;
		export let version: any;
		export const WebpackOptionsValidationError: ValidationError;
		export const ValidationError: ValidationError;
		export {
			WebpackOptionsApply,
			cli,
			AutomaticPrefetchPlugin,
			BannerPlugin,
			Cache,
			Compilation,
			Compiler,
			ContextExclusionPlugin,
			ContextReplacementPlugin,
			DefinePlugin,
			DelegatedPlugin,
			Dependency,
			DllPlugin,
			DllReferencePlugin,
			EntryPlugin,
			EnvironmentPlugin,
			EvalDevToolModulePlugin,
			EvalSourceMapDevToolPlugin,
			ExternalsPlugin,
			Generator,
			HotModuleReplacementPlugin,
			IgnorePlugin,
			JavascriptModulesPlugin,
			LibManifestPlugin,
			LibraryTemplatePlugin,
			LoaderOptionsPlugin,
			LoaderTargetPlugin,
			Module,
			ModuleFilenameHelpers,
			NoEmitOnErrorsPlugin,
			NormalModule,
			NormalModuleReplacementPlugin,
			MultiCompiler,
			Parser,
			PrefetchPlugin,
			ProgressPlugin,
			ProvidePlugin,
			RuntimeGlobals,
			RuntimeModule,
			EntryPlugin as SingleEntryPlugin,
			SourceMapDevToolPlugin,
			Stats,
			Template,
			WatchIgnorePlugin,
			WebpackOptionsDefaulter,
			__TypeLiteral_12 as cache,
			__TypeLiteral_1 as config,
			__TypeLiteral_2 as ids,
			__TypeLiteral_3 as javascript,
			__TypeLiteral_4 as optimize,
			__TypeLiteral_5 as web,
			__TypeLiteral_6 as webworker,
			__TypeLiteral_7 as node,
			__TypeLiteral_8 as wasm,
			__TypeLiteral_9 as library,
			__TypeLiteral_10 as debug,
			__TypeLiteral_11 as util
		};
	}
	export namespace __TypeLiteral_1 {
		export const getNormalizedWebpackOptions: (
			config: internals.WebpackOptions
		) => internals.WebpackOptionsNormalized;
		export const applyWebpackOptionsDefaults: (
			options: internals.WebpackOptionsNormalized
		) => void;
	}
	export namespace __TypeLiteral_10 {
		export { ProfilingPlugin };
	}
	export namespace __TypeLiteral_11 {
		export const createHash: (
			algorithm: string | typeof internals.Hash
		) => internals.Hash;
		export { comparators, serialization };
	}
	export namespace __TypeLiteral_12 {
		export { MemoryCachePlugin };
	}
	export namespace __TypeLiteral_2 {
		export {
			ChunkModuleIdRangePlugin,
			NaturalModuleIdsPlugin,
			OccurrenceModuleIdsPlugin,
			NamedModuleIdsPlugin,
			DeterministicModuleIdsPlugin,
			NamedChunkIdsPlugin,
			OccurrenceChunkIdsPlugin,
			HashedModuleIdsPlugin
		};
	}
	export namespace __TypeLiteral_3 {
		export { JavascriptModulesPlugin };
	}
	export namespace __TypeLiteral_4 {
		export {
			AggressiveMergingPlugin,
			AggressiveSplittingPlugin,
			LimitChunkCountPlugin,
			MinChunkSizePlugin,
			ModuleConcatenationPlugin,
			RuntimeChunkPlugin,
			SideEffectsFlagPlugin,
			SplitChunksPlugin
		};
	}
	export namespace __TypeLiteral_5 {
		export { FetchCompileWasmPlugin, JsonpTemplatePlugin };
	}
	export namespace __TypeLiteral_6 {
		export { WebWorkerTemplatePlugin };
	}
	export namespace __TypeLiteral_7 {
		export {
			NodeEnvironmentPlugin,
			NodeTemplatePlugin,
			ReadFileCompileWasmPlugin
		};
	}
	export namespace __TypeLiteral_8 {
		export { AsyncWebAssemblyModulesPlugin };
	}
	export namespace __TypeLiteral_9 {
		export { AbstractLibraryPlugin, EnableLibraryPlugin };
	}
	type __TypeWebpackOptions = (data: {}) =>
		| string
		| {
				/**
				 * Unique loader options identifier.
				 */
				ident?: string;
				/**
				 * Loader name.
				 */
				loader?: string;
				/**
				 * Loader options.
				 */
				options?: string | { [index: string]: any };
		  }
		| __TypeWebpackOptions
		| Array<RuleSetUseItemWebpackOptions>;
	export namespace cli {
		export let getArguments: (
			schema?: any
		) => Record<string, internals.Argument>;
		export let processArguments: (
			args: Record<string, internals.Argument>,
			config: any,
			values: Record<
				string,
				| string
				| number
				| boolean
				| RegExp
				| Array<string | number | boolean | RegExp>
			>
		) => Array<internals.Problem>;
	}
	export namespace comparators {
		export let compareChunksById: (
			a: internals.Chunk,
			b: internals.Chunk
		) => 0 | 1 | -1;
		export let compareModulesByIdentifier: (
			a: internals.Module,
			b: internals.Module
		) => 0 | 1 | -1;
		export let compareModulesById: (
			arg0: internals.ChunkGraph
		) => (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1;
		export let compareNumbers: (a: number, b: number) => 0 | 1 | -1;
		export let compareStringsNumeric: (a: string, b: string) => 0 | 1 | -1;
		export let compareModulesByPostOrderIndexOrIdentifier: (
			arg0: internals.ModuleGraph
		) => (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1;
		export let compareModulesByPreOrderIndexOrIdentifier: (
			arg0: internals.ModuleGraph
		) => (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1;
		export let compareModulesByIdOrIdentifier: (
			arg0: internals.ChunkGraph
		) => (arg0: internals.Module, arg1: internals.Module) => 0 | 1 | -1;
		export let compareChunks: (
			arg0: internals.ChunkGraph
		) => (arg0: internals.Chunk, arg1: internals.Chunk) => 0 | 1 | -1;
		export let compareIds: (
			a: string | number,
			b: string | number
		) => 0 | 1 | -1;
		export let compareChunkGroupsByIndex: (
			a: internals.ChunkGroup,
			b: internals.ChunkGroup
		) => 0 | 1 | -1;
		export let concatComparators: <T>(
			c1: (arg0: T, arg1: T) => 0 | 1 | -1,
			c2: (arg0: T, arg1: T) => 0 | 1 | -1,
			...cRest: Array<(arg0: T, arg1: T) => 0 | 1 | -1>
		) => (arg0: T, arg1: T) => 0 | 1 | -1;
		export let compareSelect: <T, R>(
			getter: (input: T) => R,
			comparator: (arg0: R, arg1: R) => 0 | 1 | -1
		) => (arg0: T, arg1: T) => 0 | 1 | -1;
		export let compareIterables: <T>(
			elementComparator: (arg0: T, arg1: T) => 0 | 1 | -1
		) => (arg0: Iterable<T>, arg1: Iterable<T>) => 0 | 1 | -1;
		export let keepOriginalOrder: <T>(
			iterable: Iterable<T>
		) => (arg0: T, arg1: T) => 0 | 1 | -1;
		export let compareChunksNatural: (
			chunkGraph: internals.ChunkGraph
		) => (arg0: internals.Chunk, arg1: internals.Chunk) => 0 | 1 | -1;
		export let compareLocations: (
			a:
				| internals.SyntheticDependencyLocation
				| internals.RealDependencyLocation,
			b:
				| internals.SyntheticDependencyLocation
				| internals.RealDependencyLocation
		) => 0 | 1 | -1;
	}
	export function exports(
		options: internals.WebpackOptions | Array<internals.WebpackOptions>,
		callback: internals.CallbackWebpack<internals.Stats | internals.MultiStats>
	): internals.Compiler | internals.MultiCompiler;
	export namespace exports {
		export let webpack: (
			options: internals.WebpackOptions | Array<internals.WebpackOptions>,
			callback: internals.CallbackWebpack<
				internals.Stats | internals.MultiStats
			>
		) => internals.Compiler | internals.MultiCompiler;
		export let validate: any;
		export let validateSchema: (schema?: any, options?: any) => void;
		export let version: any;
		export const WebpackOptionsValidationError: ValidationError;
		export const ValidationError: ValidationError;
		export {
			WebpackOptionsApply,
			cli,
			AutomaticPrefetchPlugin,
			BannerPlugin,
			Cache,
			Compilation,
			Compiler,
			ContextExclusionPlugin,
			ContextReplacementPlugin,
			DefinePlugin,
			DelegatedPlugin,
			Dependency,
			DllPlugin,
			DllReferencePlugin,
			EntryPlugin,
			EnvironmentPlugin,
			EvalDevToolModulePlugin,
			EvalSourceMapDevToolPlugin,
			ExternalsPlugin,
			Generator,
			HotModuleReplacementPlugin,
			IgnorePlugin,
			JavascriptModulesPlugin,
			LibManifestPlugin,
			LibraryTemplatePlugin,
			LoaderOptionsPlugin,
			LoaderTargetPlugin,
			Module,
			ModuleFilenameHelpers,
			NoEmitOnErrorsPlugin,
			NormalModule,
			NormalModuleReplacementPlugin,
			MultiCompiler,
			Parser,
			PrefetchPlugin,
			ProgressPlugin,
			ProvidePlugin,
			RuntimeGlobals,
			RuntimeModule,
			EntryPlugin as SingleEntryPlugin,
			SourceMapDevToolPlugin,
			Stats,
			Template,
			WatchIgnorePlugin,
			WebpackOptionsDefaulter,
			__TypeLiteral_12 as cache,
			__TypeLiteral_1 as config,
			__TypeLiteral_2 as ids,
			__TypeLiteral_3 as javascript,
			__TypeLiteral_4 as optimize,
			__TypeLiteral_5 as web,
			__TypeLiteral_6 as webworker,
			__TypeLiteral_7 as node,
			__TypeLiteral_8 as wasm,
			__TypeLiteral_9 as library,
			__TypeLiteral_10 as debug,
			__TypeLiteral_11 as util,
			WebpackOptions as Configuration
		};
	}
	export namespace serialization {
		export let register: (
			Constructor: { new (...params: Array<any>): any },
			request: string,
			name: string,
			serializer: internals.ObjectSerializer
		) => void;
		export let registerLoader: (
			regExp: RegExp,
			loader: (arg0: string) => boolean
		) => void;
		export let registerNotSerializable: (Constructor: {
			new (...params: Array<any>): any;
		}) => void;
		export let NOT_SERIALIZABLE: {};
		export let buffersSerializer: internals.Serializer;
		export let createFileSerializer: (fs?: any) => internals.Serializer;
		export { MEASURE_START_OPERATION, MEASURE_END_OPERATION };
	}
}

export = internals.exports;
