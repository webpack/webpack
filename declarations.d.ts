/// <reference path="./node_modules/assemblyscript/dist/asc.d.ts" />

type EXPECTED_ANY = any;
type EXPECTED_FUNCTION = Function;
type EXPECTED_OBJECT = object;

declare module "*.json";

// Deprecated NodeJS API usages in webpack
declare namespace NodeJS {
	interface Process {
		binding(internalModule: string): any;
	}
	interface ProcessVersions {
		pnp: "1" | "3";
	}
}

declare module "typescript-iterable" {
	// New iterator interfaces from `lib.es2015.iterable.d.ts` for compatibility with old typescript versions and `dispose`
	interface Disposable {
		[Symbol.dispose](): void;
	}

	export interface IteratorObject<T, TReturn = unknown, TNext = unknown>
		extends Iterator<T, TReturn, TNext>, Disposable {
		[Symbol.iterator](): IteratorObject<T, TReturn, TNext>;
	}

	export interface SetIterator<T> extends IteratorObject<
		T,
		BuiltinIteratorReturn,
		unknown
	> {
		[Symbol.iterator](): SetIterator<T>;
	}
}

declare module "assemblyscript/asc" {
	export * from "types:assemblyscript/cli/index";
	import * as asc from "types:assemblyscript/cli/index";
	export default asc;
}

// There are no typings for @webassemblyjs/ast
declare module "@webassemblyjs/ast" {
	export class AST extends Node {
		type: "Program";
		body: [Module];
	}
	export interface Visitor {
		ModuleImport?: (p: NodePath<ModuleImport>) => void;
		ModuleExport?: (p: NodePath<ModuleExport>) => void;
		Start?: (p: NodePath<Start>) => void;
		Global?: (p: NodePath<Global>) => void;
	}
	export function traverse(node: Node, visitor: Visitor): void;
	export class NodePath<T> {
		node: T;
		remove(): void;
	}
	export class Node {
		type: string;
	}
	export class Identifier extends Node {
		value: string;
	}
	export class Start extends Node {
		index: Identifier;
	}
	export class Module extends Node {
		id: string;
		fields: Node[];
		metadata?: Record<string, EXPECTED_ANY>;
	}
	export class ModuleImportDescription {
		type: string;
		valtype?: string;
		id?: Identifier;
		signature?: Signature;
		mutability: string;
	}
	export class ModuleImport extends Node {
		module: string;
		descr: ModuleImportDescription;
		name: string;
	}
	export class ModuleExport extends Node {
		name: string;
		descr: ModuleExportDescr;
	}
	type Index = NumberLiteral;
	export class ModuleExportDescr extends Node {
		type: string;
		exportType: string;
		id: Index;
	}
	export class NumberLiteral extends Node {
		value: number;
		raw: string;
	}
	export class FloatLiteral extends Node {}
	export class GlobalType extends Node {
		valtype: string;
		mutability: string;
	}
	export class Global extends Node {
		init: Instruction[];
		globalType: GlobalType;
	}
	export class FuncParam extends Node {
		valtype: string;
	}
	export class Instruction extends Node {
		id: string;
		args: NumberLiteral[];
	}
	export class CallInstruction extends Instruction {}
	export class ObjectInstruction extends Instruction {}
	export class Func extends Node {
		signature: Signature;
	}
	export class Signature {
		type: "Signature";
		params: FuncParam[];
		results: string[];
	}
	export class TypeInstruction extends Node {}
	export class IndexInFuncSection extends Node {}
	export function indexLiteral(index: number): Index;
	export function numberLiteralFromRaw(num: number): NumberLiteral;
	export function floatLiteral(
		value: number,
		nan?: boolean,
		inf?: boolean,
		raw?: string
	): FloatLiteral;
	export function global(globalType: GlobalType, nodes: Node[]): Global;
	export function identifier(identifier: string): Identifier;
	export function funcParam(valType: string, id: Identifier): FuncParam;
	export function instruction(inst: string, args?: Node[]): Instruction;
	export function callInstruction(funcIndex: Index): CallInstruction;
	export function objectInstruction(
		kind: string,
		type: string,
		init: Node[]
	): ObjectInstruction;
	export function signature(params: FuncParam[], results: string[]): Signature;
	export function func(
		initFuncId: Identifier,
		signature: Signature,
		funcBody: Instruction[]
	): Func;
	export function typeInstruction(
		id: Identifier | undefined,
		functype: Signature
	): TypeInstruction;
	export function indexInFuncSection(index: Index): IndexInFuncSection;
	export function moduleExport(
		identifier: string,
		descr: ModuleExportDescr
	): ModuleExport;
	export function moduleExportDescr(
		type: string,
		index: Index
	): ModuleExportDescr;

	export function getSectionMetadata(
		ast: AST,
		section: string
	): { vectorOfSize: { value: number } };
	export class FuncSignature {
		args: string[];
		result: string[];
	}
	export function moduleContextFromModuleAST(module: Module): {
		getFunction(i: number): FuncSignature;
		getStart(): Index;
	};

	// Node matcher
	export function isGlobalType(n: Node): boolean;
	export function isTable(n: Node): boolean;
	export function isMemory(n: Node): boolean;
	export function isFuncImportDescr(n: Node): boolean;
}

declare module "@webassemblyjs/wasm-parser" {
	export function decode(
		source: string | Buffer,
		options: {
			dump?: boolean;
			ignoreCodeSection?: boolean;
			ignoreDataSection?: boolean;
			ignoreCustomNameSection?: boolean;
		}
	): import("@webassemblyjs/ast").AST;
}

declare module "@webassemblyjs/wasm-edit" {
	export function addWithAST(
		ast: import("@webassemblyjs/ast").AST,
		bin: any,
		newNodes: import("@webassemblyjs/ast").Node[]
	): ArrayBuffer;
	export function editWithAST(
		ast: import("@webassemblyjs/ast").AST,
		bin: any,
		visitors: import("@webassemblyjs/ast").Visitor
	): ArrayBuffer;
}

declare module "webpack-sources" {
	export {
		SourceLike,
		RawSourceMap,
		MapOptions,
		Source,
		RawSource,
		OriginalSource,
		ReplaceSource,
		SourceMapSource,
		ConcatSource,
		PrefixSource,
		CachedSource,
		SizeOnlySource,
		CompatSource
	} from "webpack-sources/types";
}

declare module "json-parse-even-better-errors" {
	function parseJson(
		text: string,
		reviver?: (this: any, key: string, value: any) => any,
		context?: number
	): any;
	export = parseJson;
}

type RecursiveArrayOrRecord<T> =
	| { [index: string]: RecursiveArrayOrRecord<T> }
	| Array<RecursiveArrayOrRecord<T>>
	| T;

declare module "loader-runner" {
	export function getContext(resource: string): string;
	export function runLoaders(
		options: any,
		callback: (err: Error | null, result: any) => void
	): void;
}

declare module "eslint-scope/lib/referencer" {
	type Property = import("estree").Property;
	type PropertyDefinition = import("estree").PropertyDefinition;

	class Referencer {
		Property(node: PropertyDefinition | Property): void;
		PropertyDefinition(node: PropertyDefinition): void;
	}
	export = Referencer;
}
