declare module "*.json";
declare module "webpack-cli";
declare module "webpack-command";

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
		visitor: { [name: string]: (context: { node: Node }) => void }
	);
	export class Node {
		index: number;
	}
	export class Identifier extends Node {
		value: string;
	}
	export class ModuleImport extends Node {
		module: string;
		descr: {
			type: string;
			valtype: string;
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
