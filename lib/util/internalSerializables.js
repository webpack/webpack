/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// We need to include a list of requires here
// to allow webpack to be bundled with only static requires
// We could use a dynamic require(`../${request}`) but this
// would include too many modules and not every tool is able
// to process this
module.exports = {
	AsyncDependenciesBlock: () => require("../AsyncDependenciesBlock"),
	CommentCompilationWarning: () => require("../CommentCompilationWarning"),
	ContextModule: () => require("../ContextModule"),
	"cache/PackFileCacheStrategy": () =>
		require("../cache/PackFileCacheStrategy"),
	"cache/ResolverCachePlugin": () => require("../cache/ResolverCachePlugin"),
	"container/OverridableModule": () =>
		require("../container/OverridableModule"),
	"container/OverridableOriginalDependency": () =>
		require("../container/OverridableOriginalDependency"),
	"container/RemoteToExternalDependency": () =>
		require("../container/RemoteToExternalDependency"),
	"container/RemoteToOverrideDependency": () =>
		require("../container/RemoteToOverrideDependency"),
	"dependencies/AMDDefineDependency": () =>
		require("../dependencies/AMDDefineDependency"),
	"dependencies/AMDRequireArrayDependency": () =>
		require("../dependencies/AMDRequireArrayDependency"),
	"dependencies/AMDRequireContextDependency": () =>
		require("../dependencies/AMDRequireContextDependency"),
	"dependencies/AMDRequireDependenciesBlock": () =>
		require("../dependencies/AMDRequireDependenciesBlock"),
	"dependencies/AMDRequireDependency": () =>
		require("../dependencies/AMDRequireDependency"),
	"dependencies/AMDRequireItemDependency": () =>
		require("../dependencies/AMDRequireItemDependency"),
	"dependencies/CachedConstDependency": () =>
		require("../dependencies/CachedConstDependency"),
	"dependencies/CommonJsRequireContextDependency": () =>
		require("../dependencies/CommonJsRequireContextDependency"),
	"dependencies/CommonJsExportsDependency": () =>
		require("../dependencies/CommonJsExportsDependency"),
	"dependencies/CommonJsFullRequireDependency": () =>
		require("../dependencies/CommonJsFullRequireDependency"),
	"dependencies/CommonJsRequireDependency": () =>
		require("../dependencies/CommonJsRequireDependency"),
	"dependencies/CommonJsSelfReferenceDependency": () =>
		require("../dependencies/CommonJsSelfReferenceDependency"),
	"dependencies/ConstDependency": () =>
		require("../dependencies/ConstDependency"),
	"dependencies/ContextDependency": () =>
		require("../dependencies/ContextDependency"),
	"dependencies/ContextElementDependency": () =>
		require("../dependencies/ContextElementDependency"),
	"dependencies/CriticalDependencyWarning": () =>
		require("../dependencies/CriticalDependencyWarning"),
	"dependencies/DllEntryDependency": () =>
		require("../dependencies/DllEntryDependency"),
	"dependencies/ExportsInfoDependency": () =>
		require("../dependencies/ExportsInfoDependency"),
	"dependencies/HarmonyAcceptDependency": () =>
		require("../dependencies/HarmonyAcceptDependency"),
	"dependencies/HarmonyAcceptImportDependency": () =>
		require("../dependencies/HarmonyAcceptImportDependency"),
	"dependencies/HarmonyCompatibilityDependency": () =>
		require("../dependencies/HarmonyCompatibilityDependency"),
	"dependencies/HarmonyExportExpressionDependency": () =>
		require("../dependencies/HarmonyExportExpressionDependency"),
	"dependencies/HarmonyExportHeaderDependency": () =>
		require("../dependencies/HarmonyExportHeaderDependency"),
	"dependencies/HarmonyExportImportedSpecifierDependency": () =>
		require("../dependencies/HarmonyExportImportedSpecifierDependency"),
	"dependencies/HarmonyExportSpecifierDependency": () =>
		require("../dependencies/HarmonyExportSpecifierDependency"),
	"dependencies/HarmonyImportSideEffectDependency": () =>
		require("../dependencies/HarmonyImportSideEffectDependency"),
	"dependencies/HarmonyImportSpecifierDependency": () =>
		require("../dependencies/HarmonyImportSpecifierDependency"),
	"dependencies/ImportContextDependency": () =>
		require("../dependencies/ImportContextDependency"),
	"dependencies/ImportDependenciesBlock": () =>
		require("../dependencies/ImportDependenciesBlock"),
	"dependencies/ImportDependency": () =>
		require("../dependencies/ImportDependency"),
	"dependencies/ImportEagerDependency": () =>
		require("../dependencies/ImportEagerDependency"),
	"dependencies/ImportWeakDependency": () =>
		require("../dependencies/ImportWeakDependency"),
	"dependencies/JsonExportsDependency": () =>
		require("../dependencies/JsonExportsDependency"),
	"dependencies/LocalModule": () => require("../dependencies/LocalModule"),
	"dependencies/LocalModuleDependency": () =>
		require("../dependencies/LocalModuleDependency"),
	"dependencies/ModuleDecoratorDependency": () =>
		require("../dependencies/ModuleDecoratorDependency"),
	"dependencies/ModuleHotAcceptDependency": () =>
		require("../dependencies/ModuleHotAcceptDependency"),
	"dependencies/ModuleHotDeclineDependency": () =>
		require("../dependencies/ModuleHotDeclineDependency"),
	"dependencies/ModuleHotDependency": () =>
		require("../dependencies/ModuleHotDependency"),
	"dependencies/ProvidedDependency": () =>
		require("../dependencies/ProvidedDependency"),
	"dependencies/PureExpressionDependency": () =>
		require("../dependencies/PureExpressionDependency"),
	"dependencies/RequireContextDependency": () =>
		require("../dependencies/RequireContextDependency"),
	"dependencies/RequireEnsureDependenciesBlock": () =>
		require("../dependencies/RequireEnsureDependenciesBlock"),
	"dependencies/RequireEnsureDependency": () =>
		require("../dependencies/RequireEnsureDependency"),
	"dependencies/RequireEnsureItemDependency": () =>
		require("../dependencies/RequireEnsureItemDependency"),
	"dependencies/RequireHeaderDependency": () =>
		require("../dependencies/RequireHeaderDependency"),
	"dependencies/RequireIncludeDependency": () =>
		require("../dependencies/RequireIncludeDependency"),
	"dependencies/RequireIncludeDependencyParserPlugin": () =>
		require("../dependencies/RequireIncludeDependencyParserPlugin"),
	"dependencies/RequireResolveContextDependency": () =>
		require("../dependencies/RequireResolveContextDependency"),
	"dependencies/RequireResolveDependency": () =>
		require("../dependencies/RequireResolveDependency"),
	"dependencies/RequireResolveHeaderDependency": () =>
		require("../dependencies/RequireResolveHeaderDependency"),
	"dependencies/RuntimeRequirementsDependency": () =>
		require("../dependencies/RuntimeRequirementsDependency"),
	"dependencies/StaticExportsDependency": () =>
		require("../dependencies/StaticExportsDependency"),
	"dependencies/UnsupportedDependency": () =>
		require("../dependencies/UnsupportedDependency"),
	"dependencies/WebAssemblyExportImportedDependency": () =>
		require("../dependencies/WebAssemblyExportImportedDependency"),
	"dependencies/WebAssemblyImportDependency": () =>
		require("../dependencies/WebAssemblyImportDependency"),
	"optimize/ConcatenatedModule": () =>
		require("../optimize/ConcatenatedModule"),
	DependenciesBlock: () => require("../DependenciesBlock"),
	ExternalModule: () => require("../ExternalModule"),
	Module: () => require("../Module"),
	ModuleBuildError: () => require("../ModuleBuildError"),
	ModuleError: () => require("../ModuleError"),
	ModuleGraph: () => require("../ModuleGraph"),
	ModuleParseError: () => require("../ModuleParseError"),
	ModuleWarning: () => require("../ModuleWarning"),
	NormalModule: () => require("../NormalModule"),
	RawModule: () => require("../RawModule"),
	UnsupportedFeatureWarning: () => require("../UnsupportedFeatureWarning"),
	"util/LazySet": () => require("../util/LazySet"),
	WebpackError: () => require("../WebpackError"),

	"util/registerExternalSerializer": () => {
		// already registered
	}
};
