# Experimental incremental watch

The first experiment retains the module graph during `make`. Every rebuild still
runs the complete `seal`, including chunk construction, optimizations and output.
It does not implement incremental seal from PR #21563.

```js
module.exports = {
	mode: "development",
	experiments: { incremental: true },
	optimization: {
		sideEffects: false,
		concatenateModules: false
	}
};
```

The option defaults to `false`, including with `futureDefaults`.

This first version targets static entries and ordinary modules that emit
JavaScript, without module rules or loaders. Editing one existing source rebuilds changed modules
and preserves connections from unchanged modules. Imports can be added or removed.
Memory and filesystem caches remain independent of graph reuse.

A fresh module graph is used when the previous build has errors, child
compilations, other module kinds, loaders, dynamic entries or custom `make` taps.
Multiple modified files, removed files, invalidations without changed files and
changes outside existing module resources use the normal build path.
`module.unsafeCache: true`, side-effects optimization, concatenation and deferred imports disable
reuse. HMR and plugins that change the graph or add late entries are outside this
first experiment's supported scope.

Resolution dependencies remain watched conservatively after imports are removed.
This version still checks every retained module's build snapshot. It does not
promise rebuild cost proportional only to the number of changed files.

Plugins must not cache compilation-specific results by `ModuleGraph` identity.
The graph can outlive a compilation when this experiment is enabled.
