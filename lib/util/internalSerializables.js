/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// We need to include a list of requires here
// to allow webpack to be bundled with only static requires
// We could use a dynamic require(`../${request}`) but this
// would include too many modules and not every tool is able
// to process this
const internalSerializables = {
	AsyncDependenciesBlock: () =>
		/** @type {typeof import("../AsyncDependenciesBlock.js").default} */ (
			require("../AsyncDependenciesBlock.js")
		),
	ContextModule: () =>
		/** @type {typeof import("../ContextModule.js").default} */ (
			require("../ContextModule.js")
		),
	"asset/AssetModule": () =>
		/** @type {typeof import("../asset/AssetModule.js").default} */ (
			require("../asset/AssetModule.js")
		),
	"cache/PackFileCacheStrategy": () =>
		/** @type {typeof import("../cache/PackFileCacheStrategy.js").default} */ (
			require("../cache/PackFileCacheStrategy.js")
		),
	"cache/ResolverCachePlugin": () =>
		/** @type {typeof import("../cache/ResolverCachePlugin.js").default} */ (
			require("../cache/ResolverCachePlugin.js")
		),
	"container/ContainerEntryDependency": () =>
		/** @type {typeof import("../container/ContainerEntryDependency.js").default} */ (
			require("../container/ContainerEntryDependency.js")
		),
	"container/ContainerEntryModule": () =>
		/** @type {typeof import("../container/ContainerEntryModule.js").default} */ (
			require("../container/ContainerEntryModule.js")
		),
	"container/ContainerExposedDependency": () =>
		/** @type {typeof import("../container/ContainerExposedDependency.js").default} */ (
			require("../container/ContainerExposedDependency.js")
		),
	"container/FallbackDependency": () =>
		/** @type {typeof import("../container/FallbackDependency.js").default} */ (
			require("../container/FallbackDependency.js")
		),
	"container/FallbackItemDependency": () =>
		/** @type {typeof import("../container/FallbackItemDependency.js").default} */ (
			require("../container/FallbackItemDependency.js")
		),
	"container/FallbackModule": () =>
		/** @type {typeof import("../container/FallbackModule.js").default} */ (
			require("../container/FallbackModule.js")
		),
	"container/RemoteModule": () =>
		/** @type {typeof import("../container/RemoteModule.js").default} */ (
			require("../container/RemoteModule.js")
		),
	"container/RemoteToExternalDependency": () =>
		/** @type {typeof import("../container/RemoteToExternalDependency.js").default} */ (
			require("../container/RemoteToExternalDependency.js")
		),
	"dependencies/AMDDefineDependency": () =>
		/** @type {typeof import("../dependencies/AMDDefineDependency.js").default} */ (
			require("../dependencies/AMDDefineDependency.js")
		),
	"dependencies/AMDRequireArrayDependency": () =>
		/** @type {typeof import("../dependencies/AMDRequireArrayDependency.js").default} */ (
			require("../dependencies/AMDRequireArrayDependency.js")
		),
	"dependencies/AMDRequireContextDependency": () =>
		/** @type {typeof import("../dependencies/AMDRequireContextDependency.js").default} */ (
			require("../dependencies/AMDRequireContextDependency.js")
		),
	"dependencies/AMDRequireDependenciesBlock": () =>
		/** @type {typeof import("../dependencies/AMDRequireDependenciesBlock.js").default} */ (
			require("../dependencies/AMDRequireDependenciesBlock.js")
		),
	"dependencies/AMDRequireDependency": () =>
		/** @type {typeof import("../dependencies/AMDRequireDependency.js").default} */ (
			require("../dependencies/AMDRequireDependency.js")
		),
	"dependencies/AMDRequireItemDependency": () =>
		/** @type {typeof import("../dependencies/AMDRequireItemDependency.js").default} */ (
			require("../dependencies/AMDRequireItemDependency.js")
		),
	"dependencies/CachedConstDependency": () =>
		/** @type {typeof import("../dependencies/CachedConstDependency.js").default} */ (
			require("../dependencies/CachedConstDependency.js")
		),
	"dependencies/ExternalModuleDependency": () =>
		/** @type {typeof import("../dependencies/ExternalModuleDependency.js").default} */ (
			require("../dependencies/ExternalModuleDependency.js")
		),
	"dependencies/ExternalModuleInitFragment": () =>
		/** @type {typeof import("../dependencies/ExternalModuleInitFragment.js").default} */ (
			require("../dependencies/ExternalModuleInitFragment.js")
		),
	"dependencies/CreateScriptUrlDependency": () =>
		/** @type {typeof import("../dependencies/CreateScriptUrlDependency.js").default} */ (
			require("../dependencies/CreateScriptUrlDependency.js")
		),
	"dependencies/CommonJsRequireContextDependency": () =>
		/** @type {typeof import("../dependencies/CommonJsRequireContextDependency.js").default} */ (
			require("../dependencies/CommonJsRequireContextDependency.js")
		),
	"dependencies/CommonJsExportRequireDependency": () =>
		/** @type {typeof import("../dependencies/CommonJsExportRequireDependency.js").default} */ (
			require("../dependencies/CommonJsExportRequireDependency.js")
		),
	"dependencies/CommonJsExportsDependency": () =>
		/** @type {typeof import("../dependencies/CommonJsExportsDependency.js").default} */ (
			require("../dependencies/CommonJsExportsDependency.js")
		),
	"dependencies/CommonJsFullRequireDependency": () =>
		/** @type {typeof import("../dependencies/CommonJsFullRequireDependency.js").default} */ (
			require("../dependencies/CommonJsFullRequireDependency.js")
		),
	"dependencies/CommonJsRequireDependency": () =>
		/** @type {typeof import("../dependencies/CommonJsRequireDependency.js").default} */ (
			require("../dependencies/CommonJsRequireDependency.js")
		),
	"dependencies/CommonJsSelfReferenceDependency": () =>
		/** @type {typeof import("../dependencies/CommonJsSelfReferenceDependency.js").default} */ (
			require("../dependencies/CommonJsSelfReferenceDependency.js")
		),
	"dependencies/ConstDependency": () =>
		/** @type {typeof import("../dependencies/ConstDependency.js").default} */ (
			require("../dependencies/ConstDependency.js")
		),
	"dependencies/ContextDependency": () =>
		/** @type {typeof import("../dependencies/ContextDependency.js").default} */ (
			require("../dependencies/ContextDependency.js")
		),
	"dependencies/ContextElementDependency": () =>
		/** @type {typeof import("../dependencies/ContextElementDependency.js").default} */ (
			require("../dependencies/ContextElementDependency.js")
		),
	"dependencies/CriticalDependencyWarning": () =>
		/** @type {typeof import("../dependencies/CriticalDependencyWarning.js").default} */ (
			require("../dependencies/CriticalDependencyWarning.js")
		),
	"dependencies/CssImportDependency": () =>
		/** @type {typeof import("../dependencies/CssImportDependency.js").default} */ (
			require("../dependencies/CssImportDependency.js")
		),
	"dependencies/CssUrlDependency": () =>
		/** @type {typeof import("../dependencies/CssUrlDependency.js").default} */ (
			require("../dependencies/CssUrlDependency.js")
		),
	"dependencies/CssIcssImportDependency": () =>
		/** @type {typeof import("../dependencies/CssIcssImportDependency.js").default} */ (
			require("../dependencies/CssIcssImportDependency.js")
		),
	"dependencies/CssIcssExportDependency": () =>
		/** @type {typeof import("../dependencies/CssIcssExportDependency.js").default} */ (
			require("../dependencies/CssIcssExportDependency.js")
		),
	"dependencies/CssIcssSymbolDependency": () =>
		/** @type {typeof import("../dependencies/CssIcssSymbolDependency.js").default} */ (
			require("../dependencies/CssIcssSymbolDependency.js")
		),
	"dependencies/DelegatedSourceDependency": () =>
		/** @type {typeof import("../dependencies/DelegatedSourceDependency.js").default} */ (
			require("../dependencies/DelegatedSourceDependency.js")
		),
	"dependencies/DllEntryDependency": () =>
		/** @type {typeof import("../dependencies/DllEntryDependency.js").default} */ (
			require("../dependencies/DllEntryDependency.js")
		),
	"dependencies/EntryDependency": () =>
		/** @type {typeof import("../dependencies/EntryDependency.js").default} */ (
			require("../dependencies/EntryDependency.js")
		),
	"dependencies/ExportsInfoDependency": () =>
		/** @type {typeof import("../dependencies/ExportsInfoDependency.js").default} */ (
			require("../dependencies/ExportsInfoDependency.js")
		),
	"dependencies/HarmonyAcceptDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyAcceptDependency.js").default} */ (
			require("../dependencies/HarmonyAcceptDependency.js")
		),
	"dependencies/HarmonyAcceptImportDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyAcceptImportDependency.js").default} */ (
			require("../dependencies/HarmonyAcceptImportDependency.js")
		),
	"dependencies/HarmonyCompatibilityDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyCompatibilityDependency.js").default} */ (
			require("../dependencies/HarmonyCompatibilityDependency.js")
		),
	"dependencies/HarmonyExportExpressionDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyExportExpressionDependency.js").default} */ (
			require("../dependencies/HarmonyExportExpressionDependency.js")
		),
	"dependencies/HarmonyExportHeaderDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyExportHeaderDependency.js").default} */ (
			require("../dependencies/HarmonyExportHeaderDependency.js")
		),
	"dependencies/HarmonyExportImportedSpecifierDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyExportImportedSpecifierDependency.js").default} */ (
			require("../dependencies/HarmonyExportImportedSpecifierDependency.js")
		),
	"dependencies/HarmonyExportSpecifierDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyExportSpecifierDependency.js").default} */ (
			require("../dependencies/HarmonyExportSpecifierDependency.js")
		),
	"dependencies/HarmonyImportSideEffectDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyImportSideEffectDependency.js").default} */ (
			require("../dependencies/HarmonyImportSideEffectDependency.js")
		),
	"dependencies/HarmonyImportSpecifierDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyImportSpecifierDependency.js").default} */ (
			require("../dependencies/HarmonyImportSpecifierDependency.js")
		),
	"dependencies/HarmonyEvaluatedImportSpecifierDependency": () =>
		/** @type {typeof import("../dependencies/HarmonyEvaluatedImportSpecifierDependency.js").default} */ (
			require("../dependencies/HarmonyEvaluatedImportSpecifierDependency.js")
		),
	"dependencies/HtmlInlineHtmlDependency": () =>
		/** @type {typeof import("../dependencies/HtmlInlineHtmlDependency.js").default} */ (
			require("../dependencies/HtmlInlineHtmlDependency.js")
		),
	"dependencies/HtmlInlineScriptDependency": () =>
		/** @type {typeof import("../dependencies/HtmlInlineScriptDependency.js").default} */ (
			require("../dependencies/HtmlInlineScriptDependency.js")
		),
	"dependencies/HtmlInlineStyleDependency": () =>
		/** @type {typeof import("../dependencies/HtmlInlineStyleDependency.js").default} */ (
			require("../dependencies/HtmlInlineStyleDependency.js")
		),
	"dependencies/HtmlEntryDependency": () =>
		/** @type {typeof import("../dependencies/HtmlEntryDependency.js").default} */ (
			require("../dependencies/HtmlEntryDependency.js")
		),
	"dependencies/HtmlSourceDependency": () =>
		/** @type {typeof import("../dependencies/HtmlSourceDependency.js").default} */ (
			require("../dependencies/HtmlSourceDependency.js")
		),
	"dependencies/ImportContextDependency": () =>
		/** @type {typeof import("../dependencies/ImportContextDependency.js").default} */ (
			require("../dependencies/ImportContextDependency.js")
		),
	"dependencies/ImportDependency": () =>
		/** @type {typeof import("../dependencies/ImportDependency.js").default} */ (
			require("../dependencies/ImportDependency.js")
		),
	"dependencies/ImportEagerDependency": () =>
		/** @type {typeof import("../dependencies/ImportEagerDependency.js").default} */ (
			require("../dependencies/ImportEagerDependency.js")
		),
	"dependencies/ImportWeakDependency": () =>
		/** @type {typeof import("../dependencies/ImportWeakDependency.js").default} */ (
			require("../dependencies/ImportWeakDependency.js")
		),
	"dependencies/JsonExportsDependency": () =>
		/** @type {typeof import("../dependencies/JsonExportsDependency.js").default} */ (
			require("../dependencies/JsonExportsDependency.js")
		),
	"dependencies/LocalModule": () =>
		/** @type {typeof import("../dependencies/LocalModule.js").default} */ (
			require("../dependencies/LocalModule.js")
		),
	"dependencies/LocalModuleDependency": () =>
		/** @type {typeof import("../dependencies/LocalModuleDependency.js").default} */ (
			require("../dependencies/LocalModuleDependency.js")
		),
	"dependencies/ModuleDecoratorDependency": () =>
		/** @type {typeof import("../dependencies/ModuleDecoratorDependency.js").default} */ (
			require("../dependencies/ModuleDecoratorDependency.js")
		),
	"dependencies/ModuleHotAcceptDependency": () =>
		/** @type {typeof import("../dependencies/ModuleHotAcceptDependency.js").default} */ (
			require("../dependencies/ModuleHotAcceptDependency.js")
		),
	"dependencies/ModuleHotDeclineDependency": () =>
		/** @type {typeof import("../dependencies/ModuleHotDeclineDependency.js").default} */ (
			require("../dependencies/ModuleHotDeclineDependency.js")
		),
	"dependencies/ImportMetaHotAcceptDependency": () =>
		/** @type {typeof import("../dependencies/ImportMetaHotAcceptDependency.js").default} */ (
			require("../dependencies/ImportMetaHotAcceptDependency.js")
		),
	"dependencies/ImportMetaHotDeclineDependency": () =>
		/** @type {typeof import("../dependencies/ImportMetaHotDeclineDependency.js").default} */ (
			require("../dependencies/ImportMetaHotDeclineDependency.js")
		),
	"dependencies/ImportMetaContextDependency": () =>
		/** @type {typeof import("../dependencies/ImportMetaContextDependency.js").default} */ (
			require("../dependencies/ImportMetaContextDependency.js")
		),
	"dependencies/ImportMetaGlobDependency": () =>
		/** @type {typeof import("../dependencies/ImportMetaGlobDependency.js").default} */ (
			require("../dependencies/ImportMetaGlobDependency.js")
		),
	"dependencies/ProvidedDependency": () =>
		/** @type {typeof import("../dependencies/ProvidedDependency.js").default} */ (
			require("../dependencies/ProvidedDependency.js")
		),
	"dependencies/PureExpressionDependency": () =>
		/** @type {typeof import("../dependencies/PureExpressionDependency.js").default} */ (
			require("../dependencies/PureExpressionDependency.js")
		),
	"dependencies/RequireContextDependency": () =>
		/** @type {typeof import("../dependencies/RequireContextDependency.js").default} */ (
			require("../dependencies/RequireContextDependency.js")
		),
	"dependencies/RequireEnsureDependenciesBlock": () =>
		/** @type {typeof import("../dependencies/RequireEnsureDependenciesBlock.js").default} */ (
			require("../dependencies/RequireEnsureDependenciesBlock.js")
		),
	"dependencies/RequireEnsureDependency": () =>
		/** @type {typeof import("../dependencies/RequireEnsureDependency.js").default} */ (
			require("../dependencies/RequireEnsureDependency.js")
		),
	"dependencies/RequireEnsureItemDependency": () =>
		/** @type {typeof import("../dependencies/RequireEnsureItemDependency.js").default} */ (
			require("../dependencies/RequireEnsureItemDependency.js")
		),
	"dependencies/RequireHeaderDependency": () =>
		/** @type {typeof import("../dependencies/RequireHeaderDependency.js").default} */ (
			require("../dependencies/RequireHeaderDependency.js")
		),
	"dependencies/RequireIncludeDependency": () =>
		/** @type {typeof import("../dependencies/RequireIncludeDependency.js").default} */ (
			require("../dependencies/RequireIncludeDependency.js")
		),
	"dependencies/RequireIncludeDependencyParserPlugin": () =>
		/** @type {typeof import("../dependencies/RequireIncludeDependencyParserPlugin.js").default} */ (
			require("../dependencies/RequireIncludeDependencyParserPlugin.js")
		),
	"dependencies/RequireResolveContextDependency": () =>
		/** @type {typeof import("../dependencies/RequireResolveContextDependency.js").default} */ (
			require("../dependencies/RequireResolveContextDependency.js")
		),
	"dependencies/RequireResolveDependency": () =>
		/** @type {typeof import("../dependencies/RequireResolveDependency.js").default} */ (
			require("../dependencies/RequireResolveDependency.js")
		),
	"dependencies/RequireResolveHeaderDependency": () =>
		/** @type {typeof import("../dependencies/RequireResolveHeaderDependency.js").default} */ (
			require("../dependencies/RequireResolveHeaderDependency.js")
		),
	"dependencies/RuntimeRequirementsDependency": () =>
		/** @type {typeof import("../dependencies/RuntimeRequirementsDependency.js").default} */ (
			require("../dependencies/RuntimeRequirementsDependency.js")
		),
	"dependencies/StaticExportsDependency": () =>
		/** @type {typeof import("../dependencies/StaticExportsDependency.js").default} */ (
			require("../dependencies/StaticExportsDependency.js")
		),
	"dependencies/SystemPlugin": () =>
		/** @type {typeof import("../dependencies/SystemPlugin.js").default} */ (
			require("../dependencies/SystemPlugin.js")
		),
	"dependencies/UnsupportedDependency": () =>
		/** @type {typeof import("../dependencies/UnsupportedDependency.js").default} */ (
			require("../dependencies/UnsupportedDependency.js")
		),
	"dependencies/URLDependency": () =>
		/** @type {typeof import("../dependencies/URLDependency.js").default} */ (
			require("../dependencies/URLDependency.js")
		),
	"dependencies/URLContextDependency": () =>
		/** @type {typeof import("../dependencies/URLContextDependency.js").default} */ (
			require("../dependencies/URLContextDependency.js")
		),
	"dependencies/WebAssemblyImportDependency": () =>
		/** @type {typeof import("../dependencies/WebAssemblyImportDependency.js").default} */ (
			require("../dependencies/WebAssemblyImportDependency.js")
		),
	"dependencies/WebpackIsIncludedDependency": () =>
		/** @type {typeof import("../dependencies/WebpackIsIncludedDependency.js").default} */ (
			require("../dependencies/WebpackIsIncludedDependency.js")
		),
	"dependencies/WorkerDependency": () =>
		/** @type {typeof import("../dependencies/WorkerDependency.js").default} */ (
			require("../dependencies/WorkerDependency.js")
		),
	"html/HtmlModule": () =>
		/** @type {typeof import("../html/HtmlModule.js").default} */ (
			require("../html/HtmlModule.js")
		),
	"javascript/JavascriptModule": () =>
		/** @type {typeof import("../javascript/JavascriptModule.js").default} */ (
			require("../javascript/JavascriptModule.js")
		),
	"json/JsonData": () =>
		/** @type {typeof import("../json/JsonData.js").default} */ (
			require("../json/JsonData.js")
		),
	"json/JsonModule": () =>
		/** @type {typeof import("../json/JsonModule.js").default} */ (
			require("../json/JsonModule.js")
		),
	"optimize/ConcatenatedModule": () =>
		/** @type {typeof import("../optimize/ConcatenatedModule.js").default} */ (
			require("../optimize/ConcatenatedModule.js")
		),
	"wasm-async/AsyncWasmModule": () =>
		/** @type {typeof import("../wasm-async/AsyncWasmModule.js").default} */ (
			require("../wasm-async/AsyncWasmModule.js")
		),

	DependenciesBlock: () =>
		/** @type {typeof import("../DependenciesBlock.js").default} */ (
			require("../DependenciesBlock.js")
		),
	ExternalModule: () =>
		/** @type {typeof import("../ExternalModule.js").default} */ (
			require("../ExternalModule.js")
		),
	FileSystemInfo: () =>
		/** @type {typeof import("../FileSystemInfo.js").default} */ (
			require("../FileSystemInfo.js")
		),
	InitFragment: () =>
		/** @type {typeof import("../InitFragment.js").default} */ (
			require("../InitFragment.js")
		),
	ModuleGraph: () =>
		/** @type {typeof import("../ModuleGraph.js").default} */ (
			require("../ModuleGraph.js")
		),
	Module: () =>
		/** @type {typeof import("../Module.js").default} */ (
			require("../Module.js")
		),
	NormalModule: () =>
		/** @type {typeof import("../NormalModule.js").default} */ (
			require("../NormalModule.js")
		),
	CssModule: () =>
		/** @type {typeof import("../css/CssModule.js").default} */ (
			require("../css/CssModule.js")
		),
	RawDataUrlModule: () =>
		/** @type {typeof import("../asset/RawDataUrlModule.js").default} */ (
			require("../asset/RawDataUrlModule.js")
		),
	RawModule: () =>
		/** @type {typeof import("../RawModule.js").default} */ (
			require("../RawModule.js")
		),
	"sharing/ConsumeSharedModule": () =>
		/** @type {typeof import("../sharing/ConsumeSharedModule.js").default} */ (
			require("../sharing/ConsumeSharedModule.js")
		),
	"sharing/ConsumeSharedFallbackDependency": () =>
		/** @type {typeof import("../sharing/ConsumeSharedFallbackDependency.js").default} */ (
			require("../sharing/ConsumeSharedFallbackDependency.js")
		),
	"sharing/ProvideSharedModule": () =>
		/** @type {typeof import("../sharing/ProvideSharedModule.js").default} */ (
			require("../sharing/ProvideSharedModule.js")
		),
	"sharing/ProvideSharedDependency": () =>
		/** @type {typeof import("../sharing/ProvideSharedDependency.js").default} */ (
			require("../sharing/ProvideSharedDependency.js")
		),
	"sharing/ProvideForSharedDependency": () =>
		/** @type {typeof import("../sharing/ProvideForSharedDependency.js").default} */ (
			require("../sharing/ProvideForSharedDependency.js")
		),

	"errors/WebpackError": () =>
		/** @type {typeof import("../errors/WebpackError.js").default} */ (
			require("../errors/WebpackError.js")
		),
	"errors/InvalidDependenciesModuleWarning": () =>
		/** @type {typeof import("../errors/InvalidDependenciesModuleWarning.js").default} */ (
			require("../errors/InvalidDependenciesModuleWarning.js")
		),
	"errors/ModuleParseError": () =>
		/** @type {typeof import("../errors/ModuleParseError.js").default} */ (
			require("../errors/ModuleParseError.js")
		),
	"errors/ModuleWarning": () =>
		/** @type {typeof import("../errors/ModuleWarning.js").default} */ (
			require("../errors/ModuleWarning.js")
		),
	"errors/ModuleBuildError": () =>
		/** @type {typeof import("../errors/ModuleBuildError.js").default} */ (
			require("../errors/ModuleBuildError.js")
		),
	"errors/ModuleDependencyWarning": () =>
		/** @type {typeof import("../errors/ModuleDependencyWarning.js").default} */ (
			require("../errors/ModuleDependencyWarning.js")
		),
	"errors/ModuleError": () =>
		/** @type {typeof import("../errors/ModuleError.js").default} */ (
			require("../errors/ModuleError.js")
		),
	"errors/UnhandledSchemeError": () =>
		/** @type {typeof import("../errors/UnhandledSchemeError.js").default} */ (
			require("../errors/UnhandledSchemeError.js")
		),
	"errors/UnsupportedFeatureWarning": () =>
		/** @type {typeof import("../errors/UnsupportedFeatureWarning.js").default} */ (
			require("../errors/UnsupportedFeatureWarning.js")
		),
	"errors/EnvironmentNotSupportAsyncWarning": () =>
		/** @type {typeof import("../errors/EnvironmentNotSupportAsyncWarning.js").default} */ (
			require("../errors/EnvironmentNotSupportAsyncWarning.js")
		),
	"errors/CommentCompilationWarning": () =>
		/** @type {typeof import("../errors/CommentCompilationWarning.js").default} */ (
			require("../errors/CommentCompilationWarning.js")
		),
	"errors/NodeStuffInWebError": () =>
		/** @type {typeof import("../errors/NodeStuffInWebError.js").default} */ (
			require("../errors/NodeStuffInWebError.js")
		),
	"errors/JSONParseError": () =>
		/** @type {typeof import("../errors/JSONParseError.js").default} */ (
			require("../errors/JSONParseError.js")
		),

	"dll/DelegatedModule": () =>
		/** @type {typeof import("../dll/DelegatedModule.js").default} */ (
			require("../dll/DelegatedModule.js")
		),
	"dll/DllModule": () =>
		/** @type {typeof import("../dll/DllModule.js").default} */ (
			require("../dll/DllModule.js")
		),

	"util/LazySet": () =>
		/** @type {typeof import("../util/LazySet.js").default} */ (
			require("../util/LazySet.js")
		),
	"util/registerExternalSerializer": () => {
		// already registered
	}
};

export default internalSerializables;

export { internalSerializables as "module.exports" };
