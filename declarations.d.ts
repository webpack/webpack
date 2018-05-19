declare module "*.json";

// Deprecated NodeJS API usages in Webpack
declare namespace NodeJS {
	interface Process {
		binding(internalModule: string): any;
	}
}

declare module "neo-async" {
	export interface Dictionary<T> {
		[key: string]: T;
	}
	export type IterableCollection<T> = T[] | IterableIterator<T> | Dictionary<T>;

	export interface ErrorCallback<T> {
		(err?: T): void;
	}
	export interface AsyncBooleanResultCallback<E> {
		(err?: E, truthValue?: boolean): void;
	}
	export interface AsyncResultCallback<T, E> {
		(err?: E, result?: T): void;
	}
	export interface AsyncResultArrayCallback<T, E> {
		(err?: E, results?: Array<T | undefined>): void;
	}
	export interface AsyncResultObjectCallback<T, E> {
		(err: E | undefined, results: Dictionary<T | undefined>): void;
	}

	export interface AsyncFunction<T, E> {
		(callback: (err?: E, result?: T) => void): void;
	}
	export interface AsyncFunctionEx<T, E> {
		(callback: (err?: E, ...results: T[]) => void): void;
	}
	export interface AsyncIterator<T, E> {
		(item: T, callback: ErrorCallback<E>): void;
	}
	export interface AsyncForEachOfIterator<T, E> {
		(item: T, key: number | string, callback: ErrorCallback<E>): void;
	}
	export interface AsyncResultIterator<T, R, E> {
		(item: T, callback: AsyncResultCallback<R, E>): void;
	}
	export interface AsyncMemoIterator<T, R, E> {
		(memo: R | undefined, item: T, callback: AsyncResultCallback<R, E>): void;
	}
	export interface AsyncBooleanIterator<T, E> {
		(item: T, callback: AsyncBooleanResultCallback<E>): void;
	}

	export interface AsyncWorker<T, E> {
		(task: T, callback: ErrorCallback<E>): void;
	}
	export interface AsyncVoidFunction<E> {
		(callback: ErrorCallback<E>): void;
	}

	export type AsyncAutoTasks<R extends Dictionary<any>, E> = {
		[K in keyof R]: AsyncAutoTask<R[K], R, E>
	};
	export type AsyncAutoTask<R1, R extends Dictionary<any>, E> =
		| AsyncAutoTaskFunctionWithoutDependencies<R1, E>
		| (keyof R | AsyncAutoTaskFunction<R1, R, E>)[];
	export interface AsyncAutoTaskFunctionWithoutDependencies<R1, E> {
		(cb: AsyncResultCallback<R1, E> | ErrorCallback<E>): void;
	}
	export interface AsyncAutoTaskFunction<R1, R extends Dictionary<any>, E> {
		(results: R, cb: AsyncResultCallback<R1, E> | ErrorCallback<E>): void;
	}

	export function each<T, E>(
		arr: IterableCollection<T>,
		iterator: AsyncIterator<T, E>,
		callback?: ErrorCallback<E>
	): void;

	export function map<T, R, E>(
		arr: T[] | IterableIterator<T>,
		iterator: AsyncResultIterator<T, R, E>,
		callback?: AsyncResultArrayCallback<R, E>
	): void;
	export function map<T, R, E>(
		arr: Dictionary<T>,
		iterator: AsyncResultIterator<T, R, E>,
		callback?: AsyncResultArrayCallback<R, E>
	): void;

	export function parallel<T, E>(
		tasks: Array<AsyncFunction<T, E>>,
		callback?: AsyncResultArrayCallback<T, E>
	): void;
	export function parallel<T, E>(
		tasks: Dictionary<AsyncFunction<T, E>>,
		callback?: AsyncResultObjectCallback<T, E>
	): void;

	export const forEach: typeof each;
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

// There are no typings for @webassemblyjs/ast
declare module "@webassemblyjs/ast" {
	export function traverse(
		ast: any,
		visitor: {
			ModuleImport?: (p: NodePath<ModuleImport>) => void;
			ModuleExport?: (p: NodePath<ModuleExport>) => void;
			Start?: (p: NodePath<Start>) => void;
		}
	);
	export class NodePath<T> {
		node: T;
	}
	export class Node {}
	export class Identifier extends Node {
		value: string;
	}
	export class Start extends Node {
		index: Identifier;
	}
	export class ModuleImport extends Node {
		module: string;
		descr: {
			type: string;
			valtype: string;
			id: string;
		};
		name: string;
	}
	export class ModuleExport extends Node {
		name: string;
	}
	export class IndexLiteral extends Node {}
	export class NumberLiteral extends Node {}
	export class Global extends Node {}
	export class FuncParam extends Node {}
	export class Instruction extends Node {}
	export class CallInstruction extends Instruction {}
	export class ObjectInstruction extends Instruction {}
	export class Func extends Node {
		signature: Signature;
	}
	export class Signature {
		params: any;
		result: any;
	}
	export class TypeInstructionFunc extends Node {}
	export class IndexInFuncSection extends Node {}
	export function indexLiteral(index: number): IndexLiteral;
	export function numberLiteral(num: number): NumberLiteral;
	export function global(globalType: string, nodes: Node[]): Global;
	export function identifier(indentifier: string): Identifier;
	export function funcParam(valType: string, id: Identifier): FuncParam;
	export function instruction(inst: string, args: Node[]): Instruction;
	export function callInstruction(funcIndex: IndexLiteral): CallInstruction;
	export function objectInstruction(
		kind: string,
		type: string,
		init: Node[]
	): ObjectInstruction;
	export function func(initFuncId, funcParams, funcResults, funcBody): Func;
	export function typeInstructionFunc(params, result): TypeInstructionFunc;
	export function indexInFuncSection(index: IndexLiteral): IndexInFuncSection;
	export function moduleExport(
		identifier: string,
		type: string,
		index: IndexLiteral
	): ModuleExport;

	export function getSectionMetadata(ast: any, section: string);
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

type TODO = any;

declare interface SourcePosition {
	line: number;
	column: number;
}

declare interface DependencyLocation {
	name: string;
	index: number;
	start: SourcePosition;
	end: SourcePosition;
}
