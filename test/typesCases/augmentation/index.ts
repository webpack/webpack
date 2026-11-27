// A plugin types its own fields by declaration merging; each interface below
// must take a merged field. The `Record<string, any>` fallbacks of most of these
// would hide a missed merge, so the check is on the interface itself. A
// `declare module` block can also add a new interface of the same name, so each
// one also keeps a field webpack declares, which only the merged one has.
import type {
	KnownAssetModuleBuildInfo,
	KnownConcatenatedModuleBuildInfo,
	KnownContextModuleBuildInfo,
	KnownCreateStatsOptionsContext,
	KnownCssModuleBuildInfo,
	KnownCssModuleBuildMeta,
	KnownExternalModuleBuildInfo,
	KnownHtmlModuleBuildInfo,
	KnownJavascriptModuleBuildInfo,
	KnownJavascriptModuleBuildMeta,
	KnownJavascriptParserState,
	KnownJsonModuleBuildInfo,
	KnownNormalModuleBuildInfo,
	KnownParserState,
	KnownStatsGroup,
	KnownSyncWasmModuleBuildMeta,
	KnownUnsafeCacheData,
	ParserState
} from "webpack";
import type { Compiler, Generator, Parser, ParsersAndGeneratorsByModuleType } from "webpack";

declare module "webpack" {
	interface ParsersAndGeneratorsByModuleType {
		"my-type": [MyParser, MyParserOptions, Generator, MyGeneratorOptions];
	}
	interface KnownAssetModuleBuildInfo {
		myField?: number;
	}
	interface KnownConcatenatedModuleBuildInfo {
		myField?: number;
	}
	interface KnownContextModuleBuildInfo {
		myField?: number;
	}
	interface KnownCreateStatsOptionsContext {
		myField?: number;
	}
	interface KnownCssModuleBuildInfo {
		myField?: number;
	}
	interface KnownCssModuleBuildMeta {
		myField?: number;
	}
	interface KnownExternalModuleBuildInfo {
		myField?: number;
	}
	interface KnownHtmlModuleBuildInfo {
		myField?: number;
	}
	interface KnownJavascriptModuleBuildInfo {
		myField?: number;
	}
	interface KnownJavascriptModuleBuildMeta {
		myField?: number;
	}
	interface KnownJavascriptParserState {
		myField?: number;
	}
	interface KnownJsonModuleBuildInfo {
		myField?: number;
	}
	interface KnownNormalModuleBuildInfo {
		myField?: number;
	}
	interface KnownParserState {
		myField?: number;
	}
	interface KnownStatsGroup {
		myField?: number;
	}
	interface KnownSyncWasmModuleBuildMeta {
		myField?: number;
	}
	interface KnownUnsafeCacheData {
		myField?: number;
	}
}

declare class MyParser extends Parser {
	constructor(strict: boolean);
	myParse(): void;
}
type MyParserOptions = { strict: boolean };
type MyGeneratorOptions = { minify: boolean };

type MyField = number | undefined;

const fields: MyField[] = [
	({} as KnownAssetModuleBuildInfo).myField,
	({} as KnownConcatenatedModuleBuildInfo).myField,
	({} as KnownContextModuleBuildInfo).myField,
	({} as KnownCreateStatsOptionsContext).myField,
	({} as KnownCssModuleBuildInfo).myField,
	({} as KnownCssModuleBuildMeta).myField,
	({} as KnownExternalModuleBuildInfo).myField,
	({} as KnownHtmlModuleBuildInfo).myField,
	({} as KnownJavascriptModuleBuildInfo).myField,
	({} as KnownJavascriptModuleBuildMeta).myField,
	({} as KnownJavascriptParserState).myField,
	({} as KnownJsonModuleBuildInfo).myField,
	({} as KnownNormalModuleBuildInfo).myField,
	({} as KnownParserState).myField,
	({} as KnownStatsGroup).myField,
	({} as KnownSyncWasmModuleBuildMeta).myField,
	({} as KnownUnsafeCacheData).myField
];

// Each interface keeps webpack's own fields.
const own = [
	({} as KnownAssetModuleBuildInfo).dataUrl,
	({} as KnownConcatenatedModuleBuildInfo).fileDependencies,
	({} as KnownContextModuleBuildInfo).snapshot,
	({} as KnownCreateStatsOptionsContext).forToString,
	({} as KnownCssModuleBuildInfo).cssData,
	({} as KnownCssModuleBuildMeta).isCssModule,
	({} as KnownExternalModuleBuildInfo).javascriptModule,
	({} as KnownHtmlModuleBuildInfo).htmlEntries,
	({} as KnownJavascriptModuleBuildInfo).moduleConcatenationBailout,
	({} as KnownJavascriptModuleBuildMeta).strictHarmonyModule,
	({} as KnownJavascriptParserState).esmNamedExports,
	({} as KnownJsonModuleBuildInfo).jsonData,
	({} as KnownNormalModuleBuildInfo).parsed,
	({} as KnownParserState).source,
	({} as KnownStatsGroup).type,
	({} as KnownSyncWasmModuleBuildMeta).jsIncompatibleExports,
	({} as KnownUnsafeCacheData).factoryMeta,
];

// @ts-expect-error a merged field keeps its type
const wrong: string | undefined = ({} as KnownParserState).myField;

// A parser's state takes the merged field and keeps the module it parses.
declare const state: ParserState;
const fromState: MyField = state.myField;
const parsed: string | Buffer = state.source;

// A plugin's own module type gets its parser and options on the factory's hooks.
const ownJavascript: ParsersAndGeneratorsByModuleType["javascript/auto"][1] = {};
declare const compiler: Compiler;
compiler.hooks.normalModuleFactory.tap("MyPlugin", (factory) => {
	factory.hooks.createParser
		.for("my-type")
		.tap("MyPlugin", (options) => new MyParser(options.strict));
	factory.hooks.parser.for("my-type").tap("MyPlugin", (parser, options) => {
		parser.myParse();
		const strict: boolean = options.strict;
		return strict;
	});
	factory.hooks.createGenerator
		.for("my-type")
		// @ts-expect-error the generator options are `MyGeneratorOptions`
		.tap("MyPlugin", (options) => options.strict);
	const parser: MyParser = factory.getParser("my-type", { strict: true });
	// @ts-expect-error the parser options are `MyParserOptions`
	factory.getParser("my-type", { strict: "yes" });
	// A module type no plugin registers still takes any options.
	factory.getParser("other-type", { anything: 1 });
});

export { ownJavascript, fields, own, wrong, fromState, parsed };
