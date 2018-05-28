declare module "*.json";

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
			valtype?: string;
			id?: Identifier;
			signature?: Signature;
		};
		name: string;
	}
	export class ModuleExport extends Node {
		name: string;
	}
	export class ModuleExportDescr extends Node {}
	export class IndexLiteral extends Node {}
	export class NumberLiteral extends Node {}
	export class Global extends Node {}
	export class FuncParam extends Node {
		valtype: string;
	}
	export class Instruction extends Node {}
	export class CallInstruction extends Instruction {}
	export class ObjectInstruction extends Instruction {}
	export class Func extends Node {
		signature: Signature;
	}
	export class Signature {
		params: FuncParam[];
		results: string[];
	}
	export class TypeInstruction extends Node {}
	export class IndexInFuncSection extends Node {}
	export function indexLiteral(index: number): IndexLiteral;
	export function numberLiteralFromRaw(num: number): NumberLiteral;
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
	export function signature(params: FuncParam[], results: string[]): Signature;
	export function func(initFuncId, Signature, funcBody): Func;
	export function typeInstruction(id: Identifier, functype: Signature): TypeInstruction;
	export function indexInFuncSection(index: IndexLiteral): IndexInFuncSection;
	export function moduleExport(
		identifier: string,
		descr: ModuleExportDescr
	): ModuleExport;
	export function moduleExportDescr(
		type: string,
		index: ModuleExportDescr
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
