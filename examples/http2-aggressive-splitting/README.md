This example demonstrates the AggressiveSplittingPlugin for splitting the bundle into multiple smaller chunks to improve caching. This works best with a HTTP2 web server elsewise there is an overhead for the increased number of requests.

The AggressiveSplittingPlugin split every chunk until it reaches the specified `maxSize`. In this example it tries to create chunks with <50kB code (after minimizing this reduces to ~10kB). It groups modules together by folder structure. We assume modules in the same folder as similar likely to change and minimize and gzip good together.

The AggressiveSplittingPlugin records it's splitting in the webpack records and try to restore splitting from records. This ensures that after changes to the application old splittings (and chunks) are reused. They are probably already in the clients cache. Therefore it's heavily recommended to use records!

Only chunks which are bigger than the specified `minSize` are stored into the records. This ensures that these chunks fill up as your application grows, instead of creating too many chunks for every change.

Chunks can get invalid if a module changes. Modules from invalid chunks go back into the module pool and new chunks are created from all modules in the pool.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

``` js
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: "./example",
	output: {
		path: path.join(__dirname, "js"),
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			minSize: 30000,
			maxSize: 50000
		}),
		new webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production")
		})
	],
	recordsOutputPath: path.join(__dirname, "js", "records.json")
};
```

# Info

## Uncompressed

```
Hash: d585873c75fc6a13acdd
Version: webpack 2.1.0-beta.25
Time: 1714ms
                  Asset     Size  Chunks             Chunk Names
1f4709ab95bd7ea9c3e0.js  32.9 kB       7  [emitted]  
23210448cb21fea3eeb2.js  57.2 kB       0  [emitted]  
4e18f0d2e308513b1417.js  55.7 kB       2  [emitted]  
b666bfb4baf02f3293a0.js  42.1 kB       3  [emitted]  
b30ba15ed694bb94bdb2.js  54.4 kB       4  [emitted]  
16c333f8d4014b9a685c.js  52.6 kB       5  [emitted]  
041fe45e13f7a2a07bab.js    53 kB       6  [emitted]  
016a66632ae5537cd481.js  56.2 kB       1  [emitted]  
b10a81c1d9710eac5d86.js  52.5 kB       8  [emitted]  
8cbc6e8d682eb80603a5.js  51.5 kB       9  [emitted]  
06afeb557cc6ef65a8f0.js  50.7 kB      10  [emitted]  
ab283bc97ca37bbe1a90.js  50.4 kB      11  [emitted]  
6f64f3546f2ce353e672.js  60.5 kB      12  [emitted]  
c36d1ab7e821a58adba2.js  26.1 kB      13  [emitted]  
41edf76e7fc7929762c2.js  34.9 kB      14  [emitted]  
Entrypoint main = 6f64f3546f2ce353e672.js c36d1ab7e821a58adba2.js 41edf76e7fc7929762c2.js
chunk    {0} 23210448cb21fea3eeb2.js 50 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [25] (webpack)/~/react-dom/index.js 63 bytes {0} [built]
   [32] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [50] (webpack)/~/fbjs/lib/shallowEqual.js 1.74 kB {0} [built]
   [51] (webpack)/~/process/browser.js 5.3 kB {0} [built]
   [53] (webpack)/~/react/lib/DOMNamespaces.js 538 bytes {0} [built]
   [68] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [69] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [70] (webpack)/~/fbjs/lib/getActiveElement.js 895 bytes {0} [built]
   [71] (webpack)/~/react/lib/CSSProperty.js 3.69 kB {0} [built]
   [91] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [92] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [94] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [97] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.05 kB {0} [built]
   [98] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
   [99] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [100] (webpack)/~/fbjs/lib/isNode.js 693 bytes {0} [built]
  [101] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [102] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [103] (webpack)/~/react/lib/AutoFocusUtils.js 633 bytes {0} [built]
  [104] (webpack)/~/react/lib/BeforeInputEventPlugin.js 14 kB {0} [built]
  [108] (webpack)/~/react/lib/DefaultEventPluginOrder.js 1.26 kB {0} [built]
chunk    {1} 016a66632ae5537cd481.js 49.6 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [42] (webpack)/~/react/lib/ReactInstanceMap.js 1.26 kB {1} [built]
   [59] (webpack)/~/react/lib/ReactErrorUtils.js 2.26 kB {1} [built]
   [76] (webpack)/~/react/lib/ReactEmptyComponent.js 743 bytes {1} [built]
   [77] (webpack)/~/react/lib/ReactFeatureFlags.js 665 bytes {1} [built]
   [78] (webpack)/~/react/lib/ReactHostComponent.js 2.42 kB {1} [built]
   [79] (webpack)/~/react/lib/ReactInputSelection.js 4.31 kB {1} [built]
   [81] (webpack)/~/react/lib/ReactMultiChildUpdateTypes.js 864 bytes {1} [built]
   [82] (webpack)/~/react/lib/ReactNodeTypes.js 1.06 kB {1} [built]
   [83] (webpack)/~/react/lib/ViewportMetrics.js 641 bytes {1} [built]
  [124] (webpack)/~/react/lib/ReactDOMSelection.js 6.81 kB {1} [built]
  [125] (webpack)/~/react/lib/ReactDOMTextComponent.js 5.86 kB {1} [built]
  [126] (webpack)/~/react/lib/ReactDOMTextarea.js 6.36 kB {1} [built]
  [127] (webpack)/~/react/lib/ReactDOMTreeTraversal.js 3.74 kB {1} [built]
  [129] (webpack)/~/react/lib/ReactDefaultInjection.js 3.4 kB {1} [built]
  [130] (webpack)/~/react/lib/ReactEventEmitterMixin.js 1 kB {1} [built]
  [131] (webpack)/~/react/lib/ReactEventListener.js 5.38 kB {1} [built]
  [132] (webpack)/~/react/lib/ReactInjection.js 1.31 kB {1} [built]
  [133] (webpack)/~/react/lib/ReactMarkupChecksum.js 1.51 kB {1} [built]
chunk    {2} 4e18f0d2e308513b1417.js 49.7 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [36] (webpack)/~/react/lib/SyntheticEvent.js 9.21 kB {2} [built]
   [43] (webpack)/~/react/lib/SyntheticUIEvent.js 1.61 kB {2} [built]
   [47] (webpack)/~/react/lib/SyntheticMouseEvent.js 2.18 kB {2} [built]
   [61] (webpack)/~/react/lib/createMicrosoftUnsafeLocalFunction.js 864 bytes {2} [built]
   [84] (webpack)/~/react/lib/accumulateInto.js 1.73 kB {2} [built]
   [85] (webpack)/~/react/lib/forEachAccumulated.js 893 bytes {2} [built]
  [142] (webpack)/~/react/lib/SimpleEventPlugin.js 18.9 kB {2} [built]
  [144] (webpack)/~/react/lib/SyntheticClipboardEvent.js 1.21 kB {2} [built]
  [145] (webpack)/~/react/lib/SyntheticCompositionEvent.js 1.14 kB {2} [built]
  [146] (webpack)/~/react/lib/SyntheticDragEvent.js 1.11 kB {2} [built]
  [147] (webpack)/~/react/lib/SyntheticFocusEvent.js 1.1 kB {2} [built]
  [148] (webpack)/~/react/lib/SyntheticInputEvent.js 1.13 kB {2} [built]
  [149] (webpack)/~/react/lib/SyntheticKeyboardEvent.js 2.75 kB {2} [built]
  [150] (webpack)/~/react/lib/SyntheticTouchEvent.js 1.32 kB {2} [built]
  [151] (webpack)/~/react/lib/SyntheticTransitionEvent.js 1.27 kB {2} [built]
  [152] (webpack)/~/react/lib/SyntheticWheelEvent.js 1.98 kB {2} [built]
  [153] (webpack)/~/react/lib/adler32.js 1.22 kB {2} [built]
chunk    {3} b666bfb4baf02f3293a0.js 37.4 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [49] (webpack)/~/react/lib/setInnerHTML.js 3.89 kB {3} [built]
   [63] (webpack)/~/react/lib/getEventModifierState.js 1.27 kB {3} [built]
   [64] (webpack)/~/react/lib/getEventTarget.js 1.04 kB {3} [built]
   [65] (webpack)/~/react/lib/isEventSupported.js 1.97 kB {3} [built]
   [66] (webpack)/~/react/lib/shouldUpdateReactComponent.js 1.45 kB {3} [built]
   [67] (webpack)/~/react/lib/validateDOMNesting.js 13.7 kB {3} [built]
   [87] (webpack)/~/react/lib/getTextContentAccessor.js 997 bytes {3} [built]
   [88] (webpack)/~/react/lib/instantiateReactComponent.js 4.81 kB {3} [built]
   [89] (webpack)/~/react/lib/isTextInputElement.js 1.08 kB {3} [built]
   [90] (webpack)/~/react/lib/setTextContent.js 1.4 kB {3} [built]
  [159] (webpack)/~/react/lib/getNodeForCharacterOffset.js 1.66 kB {3} [built]
  [160] (webpack)/~/react/lib/getVendorPrefixedEventName.js 2.92 kB {3} [built]
  [161] (webpack)/~/react/lib/quoteAttributeValueForBrowser.js 749 bytes {3} [built]
  [162] (webpack)/~/react/lib/renderSubtreeIntoContainer.js 466 bytes {3} [built]
chunk    {4} b30ba15ed694bb94bdb2.js 49.9 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [35] (webpack)/~/react/lib/EventConstants.js 2.17 kB {4} [built]
   [40] (webpack)/~/react/lib/EventPluginHub.js 8.32 kB {4} [built]
   [41] (webpack)/~/react/lib/EventPropagators.js 5.32 kB {4} [built]
   [45] (webpack)/~/react/lib/DisabledInputUtils.js 1.16 kB {4} [built]
   [54] (webpack)/~/react/lib/EventPluginRegistry.js 9.48 kB {4} [built]
   [55] (webpack)/~/react/lib/EventPluginUtils.js 8.17 kB {4} [built]
   [57] (webpack)/~/react/lib/ReactComponentEnvironment.js 1.34 kB {4} [built]
   [74] (webpack)/~/react/lib/ReactDOMComponentFlags.js 471 bytes {4} [built]
  [109] (webpack)/~/react/lib/EnterLeaveEventPlugin.js 3.46 kB {4} [built]
  [110] (webpack)/~/react/lib/FallbackCompositionState.js 2.47 kB {4} [built]
  [111] (webpack)/~/react/lib/HTMLDOMPropertyConfig.js 5.49 kB {4} [built]
  [113] (webpack)/~/react/lib/ReactComponentBrowserEnvironment.js 958 bytes {4} [built]
  [116] (webpack)/~/react/lib/ReactDOMButton.js 634 bytes {4} [built]
  [120] (webpack)/~/react/lib/ReactDOMFeatureFlags.js 460 bytes {4} [built]
chunk    {5} 16c333f8d4014b9a685c.js 49.8 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [34] (webpack)/~/react/lib/ReactUpdates.js 9.6 kB {5} [built]
   [39] (webpack)/~/react/lib/ReactReconciler.js 6.25 kB {5} [built]
   [60] (webpack)/~/react/lib/ReactUpdateQueue.js 9.03 kB {5} [built]
  [137] (webpack)/~/react/lib/ReactRef.js 2.47 kB {5} [built]
  [138] (webpack)/~/react/lib/ReactServerRenderingTransaction.js 2.35 kB {5} [built]
  [139] (webpack)/~/react/lib/ReactServerUpdateQueue.js 4.95 kB {5} [built]
  [140] (webpack)/~/react/lib/SVGDOMPropertyConfig.js 7.36 kB {5} [built]
  [141] (webpack)/~/react/lib/SelectEventPlugin.js 6.51 kB {5} [built]
  [143] (webpack)/~/react/lib/SyntheticAnimationEvent.js 1.25 kB {5} [built]
chunk    {6} 041fe45e13f7a2a07bab.js 49.6 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [31] (webpack)/~/react/lib/ReactDOMComponentTree.js 6.2 kB {6} [built]
   [46] (webpack)/~/react/lib/ReactBrowserEventEmitter.js 12.9 kB {6} [built]
   [56] (webpack)/~/react/lib/LinkedValueUtils.js 5.28 kB {6} [built]
   [58] (webpack)/~/react/lib/ReactComponentTreeHook.js 10.1 kB {6} [built]
  [112] (webpack)/~/react/lib/ReactChildReconciler.js 6.13 kB {6} [built]
  [115] (webpack)/~/react/lib/ReactDOM.js 5.08 kB {6} [built]
  [118] (webpack)/~/react/lib/ReactDOMContainerInfo.js 1.01 kB {6} [built]
  [119] (webpack)/~/react/lib/ReactDOMEmptyComponent.js 1.94 kB {6} [built]
  [121] (webpack)/~/react/lib/ReactDOMIDOperations.js 996 bytes {6} [built]
chunk    {7} 1f4709ab95bd7ea9c3e0.js 30.1 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [44] (webpack)/~/react/lib/Transaction.js 9.61 kB {7} [built]
   [48] (webpack)/~/react/lib/escapeTextContentForBrowser.js 3.48 kB {7} [built]
   [62] (webpack)/~/react/lib/getEventCharCode.js 1.54 kB {7} [built]
  [154] (webpack)/~/react/lib/checkReactTypeSpec.js 4.23 kB {7} [built]
  [155] (webpack)/~/react/lib/dangerousStyleValue.js 3.06 kB {7} [built]
  [156] (webpack)/~/react/lib/findDOMNode.js 2.49 kB {7} [built]
  [157] (webpack)/~/react/lib/flattenChildren.js 2.79 kB {7} [built]
  [158] (webpack)/~/react/lib/getEventKey.js 2.9 kB {7} [built]
chunk    {8} b10a81c1d9710eac5d86.js 49.9 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [37] (webpack)/~/react/lib/DOMLazyTree.js 3.75 kB {8} [built]
   [38] (webpack)/~/react/lib/DOMProperty.js 8.13 kB {8} [built]
   [52] (webpack)/~/react/lib/DOMChildrenOperations.js 7.3 kB {8} [built]
   [72] (webpack)/~/react/lib/CallbackQueue.js 2.73 kB {8} [built]
   [73] (webpack)/~/react/lib/DOMPropertyOperations.js 7.41 kB {8} [built]
  [105] (webpack)/~/react/lib/CSSPropertyOperations.js 6.85 kB {8} [built]
  [106] (webpack)/~/react/lib/ChangeEventPlugin.js 11.5 kB {8} [built]
  [107] (webpack)/~/react/lib/Danger.js 2.27 kB {8} [built]
chunk    {9} 8cbc6e8d682eb80603a5.js 49.9 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [80] (webpack)/~/react/lib/ReactMount.js 25.5 kB {9} [built]
   [86] (webpack)/~/react/lib/getHostComponentFromComposite.js 789 bytes {9} [built]
  [134] (webpack)/~/react/lib/ReactMultiChild.js 14.8 kB {9} [built]
  [135] (webpack)/~/react/lib/ReactOwner.js 3.6 kB {9} [built]
  [136] (webpack)/~/react/lib/ReactReconcileTransaction.js 5.31 kB {9} [built]
chunk   {10} 06afeb557cc6ef65a8f0.js 50 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [33] (webpack)/~/react/lib/ReactInstrumentation.js 559 bytes {10} [built]
  [114] (webpack)/~/react/lib/ReactCompositeComponent.js 35.4 kB {10} [built]
  [122] (webpack)/~/react/lib/ReactDOMInput.js 12.1 kB {10} [built]
  [128] (webpack)/~/react/lib/ReactDefaultBatchingStrategy.js 1.92 kB {10} [built]
chunk   {11} ab283bc97ca37bbe1a90.js 49.6 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [75] (webpack)/~/react/lib/ReactDOMSelect.js 6.94 kB {11} [built]
  [117] (webpack)/~/react/lib/ReactDOMComponent.js 38.9 kB {11} [built]
  [123] (webpack)/~/react/lib/ReactDOMOption.js 3.73 kB {11} [built]
chunk   {12} 6f64f3546f2ce353e672.js 50 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [30] ./example.js 
    [0] (webpack)/~/fbjs/lib/warning.js 2.1 kB {12} [built]
    [1] (webpack)/~/react/lib/ReactElement.js 11.7 kB {12} [built]
    [2] (webpack)/~/fbjs/lib/invariant.js 1.49 kB {12} [built]
    [4] (webpack)/~/object-assign/index.js 1.99 kB {12} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {12} [built]
    [7] (webpack)/~/react/lib/ReactComponent.js 4.64 kB {12} [built]
    [8] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.4 kB {12} [built]
    [9] (webpack)/~/react/lib/ReactCurrentOwner.js 657 bytes {12} [built]
   [10] (webpack)/~/fbjs/lib/keyMirror.js 1.25 kB {12} [built]
   [11] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 614 bytes {12} [built]
   [15] (webpack)/~/fbjs/lib/keyOf.js 1.1 kB {12} [built]
   [16] (webpack)/~/react/lib/PooledClass.js 3.59 kB {12} [built]
   [17] (webpack)/~/react/lib/KeyEscapeUtils.js 1.33 kB {12} [built]
   [21] (webpack)/~/react/lib/ReactChildren.js 6.22 kB {12} [built]
   [26] (webpack)/~/react/lib/React.js 2.72 kB {12} [built]
   [27] (webpack)/~/react/lib/ReactDOMFactories.js 5.56 kB {12} [built]
chunk   {13} c36d1ab7e821a58adba2.js 22.8 kB [initial] [rendered]
    > aggressive-splitted main [30] ./example.js 
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.27 kB {13} [built]
   [12] (webpack)/~/react/lib/canDefineProperty.js 632 bytes {13} [built]
   [13] (webpack)/~/react/lib/getIteratorFn.js 1.15 kB {13} [built]
   [14] (webpack)/~/react/react.js 56 bytes {13} [built]
   [18] (webpack)/~/react/lib/ReactPropTypeLocations.js 552 bytes {13} [built]
   [19] (webpack)/~/react/lib/ReactPropTypesSecret.js 478 bytes {13} [built]
   [23] (webpack)/~/react/lib/ReactPropTypes.js 15.6 kB {13} [built]
   [24] (webpack)/~/react/lib/ReactVersion.js 382 bytes {13} [built]
   [28] (webpack)/~/react/lib/ReactPureComponent.js 1.36 kB {13} [built]
   [29] (webpack)/~/react/lib/onlyChild.js 1.37 kB {13} [built]
chunk   {14} 41edf76e7fc7929762c2.js 34 kB [initial] [rendered]
    > aggressive-splitted main [30] ./example.js 
   [20] (webpack)/~/react/lib/traverseAllChildren.js 6.74 kB {14} [built]
   [22] (webpack)/~/react/lib/ReactClass.js 27.2 kB {14} [built]
   [30] ./example.js 42 bytes {14} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: d585873c75fc6a13acdd
Version: webpack 2.1.0-beta.25
Time: 4632ms
                  Asset     Size  Chunks             Chunk Names
1f4709ab95bd7ea9c3e0.js  4.05 kB       7  [emitted]  
23210448cb21fea3eeb2.js  11.7 kB       0  [emitted]  
4e18f0d2e308513b1417.js  15.3 kB       2  [emitted]  
b666bfb4baf02f3293a0.js  5.45 kB       3  [emitted]  
b30ba15ed694bb94bdb2.js  12.3 kB       4  [emitted]  
16c333f8d4014b9a685c.js  13.6 kB       5  [emitted]  
041fe45e13f7a2a07bab.js  12.9 kB       6  [emitted]  
016a66632ae5537cd481.js  11.5 kB       1  [emitted]  
b10a81c1d9710eac5d86.js  10.1 kB       8  [emitted]  
8cbc6e8d682eb80603a5.js  8.04 kB       9  [emitted]  
06afeb557cc6ef65a8f0.js  10.4 kB      10  [emitted]  
ab283bc97ca37bbe1a90.js  12.7 kB      11  [emitted]  
6f64f3546f2ce353e672.js  11.6 kB      12  [emitted]  
c36d1ab7e821a58adba2.js  5.47 kB      13  [emitted]  
41edf76e7fc7929762c2.js  4.69 kB      14  [emitted]  
Entrypoint main = 6f64f3546f2ce353e672.js c36d1ab7e821a58adba2.js 41edf76e7fc7929762c2.js
chunk    {0} 23210448cb21fea3eeb2.js 50 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [25] (webpack)/~/react-dom/index.js 63 bytes {0} [built]
   [32] (webpack)/~/fbjs/lib/ExecutionEnvironment.js 1.06 kB {0} [built]
   [50] (webpack)/~/fbjs/lib/shallowEqual.js 1.74 kB {0} [built]
   [51] (webpack)/~/process/browser.js 5.3 kB {0} [built]
   [53] (webpack)/~/react/lib/DOMNamespaces.js 538 bytes {0} [built]
   [68] (webpack)/~/fbjs/lib/EventListener.js 2.67 kB {0} [built]
   [69] (webpack)/~/fbjs/lib/focusNode.js 704 bytes {0} [built]
   [70] (webpack)/~/fbjs/lib/getActiveElement.js 895 bytes {0} [built]
   [71] (webpack)/~/react/lib/CSSProperty.js 3.69 kB {0} [built]
   [91] (webpack)/~/fbjs/lib/camelize.js 708 bytes {0} [built]
   [92] (webpack)/~/fbjs/lib/camelizeStyleName.js 1 kB {0} [built]
   [93] (webpack)/~/fbjs/lib/containsNode.js 1.05 kB {0} [built]
   [94] (webpack)/~/fbjs/lib/createArrayFromMixed.js 4.11 kB {0} [built]
   [95] (webpack)/~/fbjs/lib/createNodesFromMarkup.js 2.66 kB {0} [built]
   [96] (webpack)/~/fbjs/lib/getMarkupWrap.js 3.04 kB {0} [built]
   [97] (webpack)/~/fbjs/lib/getUnboundedScrollPosition.js 1.05 kB {0} [built]
   [98] (webpack)/~/fbjs/lib/hyphenate.js 800 bytes {0} [built]
   [99] (webpack)/~/fbjs/lib/hyphenateStyleName.js 974 bytes {0} [built]
  [100] (webpack)/~/fbjs/lib/isNode.js 693 bytes {0} [built]
  [101] (webpack)/~/fbjs/lib/isTextNode.js 605 bytes {0} [built]
  [102] (webpack)/~/fbjs/lib/memoizeStringOnly.js 698 bytes {0} [built]
  [103] (webpack)/~/react/lib/AutoFocusUtils.js 633 bytes {0} [built]
  [104] (webpack)/~/react/lib/BeforeInputEventPlugin.js 14 kB {0} [built]
  [108] (webpack)/~/react/lib/DefaultEventPluginOrder.js 1.26 kB {0} [built]
chunk    {1} 016a66632ae5537cd481.js 49.6 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [42] (webpack)/~/react/lib/ReactInstanceMap.js 1.26 kB {1} [built]
   [59] (webpack)/~/react/lib/ReactErrorUtils.js 2.26 kB {1} [built]
   [76] (webpack)/~/react/lib/ReactEmptyComponent.js 743 bytes {1} [built]
   [77] (webpack)/~/react/lib/ReactFeatureFlags.js 665 bytes {1} [built]
   [78] (webpack)/~/react/lib/ReactHostComponent.js 2.42 kB {1} [built]
   [79] (webpack)/~/react/lib/ReactInputSelection.js 4.31 kB {1} [built]
   [81] (webpack)/~/react/lib/ReactMultiChildUpdateTypes.js 864 bytes {1} [built]
   [82] (webpack)/~/react/lib/ReactNodeTypes.js 1.06 kB {1} [built]
   [83] (webpack)/~/react/lib/ViewportMetrics.js 641 bytes {1} [built]
  [124] (webpack)/~/react/lib/ReactDOMSelection.js 6.81 kB {1} [built]
  [125] (webpack)/~/react/lib/ReactDOMTextComponent.js 5.86 kB {1} [built]
  [126] (webpack)/~/react/lib/ReactDOMTextarea.js 6.36 kB {1} [built]
  [127] (webpack)/~/react/lib/ReactDOMTreeTraversal.js 3.74 kB {1} [built]
  [129] (webpack)/~/react/lib/ReactDefaultInjection.js 3.4 kB {1} [built]
  [130] (webpack)/~/react/lib/ReactEventEmitterMixin.js 1 kB {1} [built]
  [131] (webpack)/~/react/lib/ReactEventListener.js 5.38 kB {1} [built]
  [132] (webpack)/~/react/lib/ReactInjection.js 1.31 kB {1} [built]
  [133] (webpack)/~/react/lib/ReactMarkupChecksum.js 1.51 kB {1} [built]
chunk    {2} 4e18f0d2e308513b1417.js 49.7 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [36] (webpack)/~/react/lib/SyntheticEvent.js 9.21 kB {2} [built]
   [43] (webpack)/~/react/lib/SyntheticUIEvent.js 1.61 kB {2} [built]
   [47] (webpack)/~/react/lib/SyntheticMouseEvent.js 2.18 kB {2} [built]
   [61] (webpack)/~/react/lib/createMicrosoftUnsafeLocalFunction.js 864 bytes {2} [built]
   [84] (webpack)/~/react/lib/accumulateInto.js 1.73 kB {2} [built]
   [85] (webpack)/~/react/lib/forEachAccumulated.js 893 bytes {2} [built]
  [142] (webpack)/~/react/lib/SimpleEventPlugin.js 18.9 kB {2} [built]
  [144] (webpack)/~/react/lib/SyntheticClipboardEvent.js 1.21 kB {2} [built]
  [145] (webpack)/~/react/lib/SyntheticCompositionEvent.js 1.14 kB {2} [built]
  [146] (webpack)/~/react/lib/SyntheticDragEvent.js 1.11 kB {2} [built]
  [147] (webpack)/~/react/lib/SyntheticFocusEvent.js 1.1 kB {2} [built]
  [148] (webpack)/~/react/lib/SyntheticInputEvent.js 1.13 kB {2} [built]
  [149] (webpack)/~/react/lib/SyntheticKeyboardEvent.js 2.75 kB {2} [built]
  [150] (webpack)/~/react/lib/SyntheticTouchEvent.js 1.32 kB {2} [built]
  [151] (webpack)/~/react/lib/SyntheticTransitionEvent.js 1.27 kB {2} [built]
  [152] (webpack)/~/react/lib/SyntheticWheelEvent.js 1.98 kB {2} [built]
  [153] (webpack)/~/react/lib/adler32.js 1.22 kB {2} [built]
chunk    {3} b666bfb4baf02f3293a0.js 37.4 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [49] (webpack)/~/react/lib/setInnerHTML.js 3.89 kB {3} [built]
   [63] (webpack)/~/react/lib/getEventModifierState.js 1.27 kB {3} [built]
   [64] (webpack)/~/react/lib/getEventTarget.js 1.04 kB {3} [built]
   [65] (webpack)/~/react/lib/isEventSupported.js 1.97 kB {3} [built]
   [66] (webpack)/~/react/lib/shouldUpdateReactComponent.js 1.45 kB {3} [built]
   [67] (webpack)/~/react/lib/validateDOMNesting.js 13.7 kB {3} [built]
   [87] (webpack)/~/react/lib/getTextContentAccessor.js 997 bytes {3} [built]
   [88] (webpack)/~/react/lib/instantiateReactComponent.js 4.81 kB {3} [built]
   [89] (webpack)/~/react/lib/isTextInputElement.js 1.08 kB {3} [built]
   [90] (webpack)/~/react/lib/setTextContent.js 1.4 kB {3} [built]
  [159] (webpack)/~/react/lib/getNodeForCharacterOffset.js 1.66 kB {3} [built]
  [160] (webpack)/~/react/lib/getVendorPrefixedEventName.js 2.92 kB {3} [built]
  [161] (webpack)/~/react/lib/quoteAttributeValueForBrowser.js 749 bytes {3} [built]
  [162] (webpack)/~/react/lib/renderSubtreeIntoContainer.js 466 bytes {3} [built]
chunk    {4} b30ba15ed694bb94bdb2.js 49.9 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [35] (webpack)/~/react/lib/EventConstants.js 2.17 kB {4} [built]
   [40] (webpack)/~/react/lib/EventPluginHub.js 8.32 kB {4} [built]
   [41] (webpack)/~/react/lib/EventPropagators.js 5.32 kB {4} [built]
   [45] (webpack)/~/react/lib/DisabledInputUtils.js 1.16 kB {4} [built]
   [54] (webpack)/~/react/lib/EventPluginRegistry.js 9.48 kB {4} [built]
   [55] (webpack)/~/react/lib/EventPluginUtils.js 8.17 kB {4} [built]
   [57] (webpack)/~/react/lib/ReactComponentEnvironment.js 1.34 kB {4} [built]
   [74] (webpack)/~/react/lib/ReactDOMComponentFlags.js 471 bytes {4} [built]
  [109] (webpack)/~/react/lib/EnterLeaveEventPlugin.js 3.46 kB {4} [built]
  [110] (webpack)/~/react/lib/FallbackCompositionState.js 2.47 kB {4} [built]
  [111] (webpack)/~/react/lib/HTMLDOMPropertyConfig.js 5.49 kB {4} [built]
  [113] (webpack)/~/react/lib/ReactComponentBrowserEnvironment.js 958 bytes {4} [built]
  [116] (webpack)/~/react/lib/ReactDOMButton.js 634 bytes {4} [built]
  [120] (webpack)/~/react/lib/ReactDOMFeatureFlags.js 460 bytes {4} [built]
chunk    {5} 16c333f8d4014b9a685c.js 49.8 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [34] (webpack)/~/react/lib/ReactUpdates.js 9.6 kB {5} [built]
   [39] (webpack)/~/react/lib/ReactReconciler.js 6.25 kB {5} [built]
   [60] (webpack)/~/react/lib/ReactUpdateQueue.js 9.03 kB {5} [built]
  [137] (webpack)/~/react/lib/ReactRef.js 2.47 kB {5} [built]
  [138] (webpack)/~/react/lib/ReactServerRenderingTransaction.js 2.35 kB {5} [built]
  [139] (webpack)/~/react/lib/ReactServerUpdateQueue.js 4.95 kB {5} [built]
  [140] (webpack)/~/react/lib/SVGDOMPropertyConfig.js 7.36 kB {5} [built]
  [141] (webpack)/~/react/lib/SelectEventPlugin.js 6.51 kB {5} [built]
  [143] (webpack)/~/react/lib/SyntheticAnimationEvent.js 1.25 kB {5} [built]
chunk    {6} 041fe45e13f7a2a07bab.js 49.6 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [31] (webpack)/~/react/lib/ReactDOMComponentTree.js 6.2 kB {6} [built]
   [46] (webpack)/~/react/lib/ReactBrowserEventEmitter.js 12.9 kB {6} [built]
   [56] (webpack)/~/react/lib/LinkedValueUtils.js 5.28 kB {6} [built]
   [58] (webpack)/~/react/lib/ReactComponentTreeHook.js 10.1 kB {6} [built]
  [112] (webpack)/~/react/lib/ReactChildReconciler.js 6.13 kB {6} [built]
  [115] (webpack)/~/react/lib/ReactDOM.js 5.08 kB {6} [built]
  [118] (webpack)/~/react/lib/ReactDOMContainerInfo.js 1.01 kB {6} [built]
  [119] (webpack)/~/react/lib/ReactDOMEmptyComponent.js 1.94 kB {6} [built]
  [121] (webpack)/~/react/lib/ReactDOMIDOperations.js 996 bytes {6} [built]
chunk    {7} 1f4709ab95bd7ea9c3e0.js 30.1 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [44] (webpack)/~/react/lib/Transaction.js 9.61 kB {7} [built]
   [48] (webpack)/~/react/lib/escapeTextContentForBrowser.js 3.48 kB {7} [built]
   [62] (webpack)/~/react/lib/getEventCharCode.js 1.54 kB {7} [built]
  [154] (webpack)/~/react/lib/checkReactTypeSpec.js 4.23 kB {7} [built]
  [155] (webpack)/~/react/lib/dangerousStyleValue.js 3.06 kB {7} [built]
  [156] (webpack)/~/react/lib/findDOMNode.js 2.49 kB {7} [built]
  [157] (webpack)/~/react/lib/flattenChildren.js 2.79 kB {7} [built]
  [158] (webpack)/~/react/lib/getEventKey.js 2.9 kB {7} [built]
chunk    {8} b10a81c1d9710eac5d86.js 49.9 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [37] (webpack)/~/react/lib/DOMLazyTree.js 3.75 kB {8} [built]
   [38] (webpack)/~/react/lib/DOMProperty.js 8.13 kB {8} [built]
   [52] (webpack)/~/react/lib/DOMChildrenOperations.js 7.3 kB {8} [built]
   [72] (webpack)/~/react/lib/CallbackQueue.js 2.73 kB {8} [built]
   [73] (webpack)/~/react/lib/DOMPropertyOperations.js 7.41 kB {8} [built]
  [105] (webpack)/~/react/lib/CSSPropertyOperations.js 6.85 kB {8} [built]
  [106] (webpack)/~/react/lib/ChangeEventPlugin.js 11.5 kB {8} [built]
  [107] (webpack)/~/react/lib/Danger.js 2.27 kB {8} [built]
chunk    {9} 8cbc6e8d682eb80603a5.js 49.9 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [80] (webpack)/~/react/lib/ReactMount.js 25.5 kB {9} [built]
   [86] (webpack)/~/react/lib/getHostComponentFromComposite.js 789 bytes {9} [built]
  [134] (webpack)/~/react/lib/ReactMultiChild.js 14.8 kB {9} [built]
  [135] (webpack)/~/react/lib/ReactOwner.js 3.6 kB {9} [built]
  [136] (webpack)/~/react/lib/ReactReconcileTransaction.js 5.31 kB {9} [built]
chunk   {10} 06afeb557cc6ef65a8f0.js 50 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [33] (webpack)/~/react/lib/ReactInstrumentation.js 559 bytes {10} [built]
  [114] (webpack)/~/react/lib/ReactCompositeComponent.js 35.4 kB {10} [built]
  [122] (webpack)/~/react/lib/ReactDOMInput.js 12.1 kB {10} [built]
  [128] (webpack)/~/react/lib/ReactDefaultBatchingStrategy.js 1.92 kB {10} [built]
chunk   {11} ab283bc97ca37bbe1a90.js 49.6 kB {14} {12} {13} [rendered] [recorded]
    > aggressive-splitted [30] ./example.js 2:0-22
   [75] (webpack)/~/react/lib/ReactDOMSelect.js 6.94 kB {11} [built]
  [117] (webpack)/~/react/lib/ReactDOMComponent.js 38.9 kB {11} [built]
  [123] (webpack)/~/react/lib/ReactDOMOption.js 3.73 kB {11} [built]
chunk   {12} 6f64f3546f2ce353e672.js 50 kB [entry] [rendered] [recorded]
    > aggressive-splitted main [30] ./example.js 
    [0] (webpack)/~/fbjs/lib/warning.js 2.1 kB {12} [built]
    [1] (webpack)/~/react/lib/ReactElement.js 11.7 kB {12} [built]
    [2] (webpack)/~/fbjs/lib/invariant.js 1.49 kB {12} [built]
    [4] (webpack)/~/object-assign/index.js 1.99 kB {12} [built]
    [5] (webpack)/~/fbjs/lib/emptyFunction.js 1.08 kB {12} [built]
    [6] (webpack)/~/fbjs/lib/emptyObject.js 458 bytes {12} [built]
    [7] (webpack)/~/react/lib/ReactComponent.js 4.64 kB {12} [built]
    [8] (webpack)/~/react/lib/ReactNoopUpdateQueue.js 3.4 kB {12} [built]
    [9] (webpack)/~/react/lib/ReactCurrentOwner.js 657 bytes {12} [built]
   [10] (webpack)/~/fbjs/lib/keyMirror.js 1.25 kB {12} [built]
   [11] (webpack)/~/react/lib/ReactPropTypeLocationNames.js 614 bytes {12} [built]
   [15] (webpack)/~/fbjs/lib/keyOf.js 1.1 kB {12} [built]
   [16] (webpack)/~/react/lib/PooledClass.js 3.59 kB {12} [built]
   [17] (webpack)/~/react/lib/KeyEscapeUtils.js 1.33 kB {12} [built]
   [21] (webpack)/~/react/lib/ReactChildren.js 6.22 kB {12} [built]
   [26] (webpack)/~/react/lib/React.js 2.72 kB {12} [built]
   [27] (webpack)/~/react/lib/ReactDOMFactories.js 5.56 kB {12} [built]
chunk   {13} c36d1ab7e821a58adba2.js 22.8 kB [initial] [rendered]
    > aggressive-splitted main [30] ./example.js 
    [3] (webpack)/~/react/lib/reactProdInvariant.js 1.27 kB {13} [built]
   [12] (webpack)/~/react/lib/canDefineProperty.js 632 bytes {13} [built]
   [13] (webpack)/~/react/lib/getIteratorFn.js 1.15 kB {13} [built]
   [14] (webpack)/~/react/react.js 56 bytes {13} [built]
   [18] (webpack)/~/react/lib/ReactPropTypeLocations.js 552 bytes {13} [built]
   [19] (webpack)/~/react/lib/ReactPropTypesSecret.js 478 bytes {13} [built]
   [23] (webpack)/~/react/lib/ReactPropTypes.js 15.6 kB {13} [built]
   [24] (webpack)/~/react/lib/ReactVersion.js 382 bytes {13} [built]
   [28] (webpack)/~/react/lib/ReactPureComponent.js 1.36 kB {13} [built]
   [29] (webpack)/~/react/lib/onlyChild.js 1.37 kB {13} [built]
chunk   {14} 41edf76e7fc7929762c2.js 34 kB [initial] [rendered]
    > aggressive-splitted main [30] ./example.js 
   [20] (webpack)/~/react/lib/traverseAllChildren.js 6.74 kB {14} [built]
   [22] (webpack)/~/react/lib/ReactClass.js 27.2 kB {14} [built]
   [30] ./example.js 42 bytes {14} [built]
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "../../node_modules/fbjs/lib/warning.js": 0,
      "../../node_modules/react/lib/ReactElement.js": 1,
      "../../node_modules/fbjs/lib/invariant.js": 2,
      "../../node_modules/react/lib/reactProdInvariant.js": 3,
      "../../node_modules/object-assign/index.js": 4,
      "../../node_modules/fbjs/lib/emptyFunction.js": 5,
      "../../node_modules/fbjs/lib/emptyObject.js": 6,
      "../../node_modules/react/lib/ReactComponent.js": 7,
      "../../node_modules/react/lib/ReactNoopUpdateQueue.js": 8,
      "../../node_modules/react/lib/ReactCurrentOwner.js": 9,
      "../../node_modules/fbjs/lib/keyMirror.js": 10,
      "../../node_modules/react/lib/ReactPropTypeLocationNames.js": 11,
      "../../node_modules/react/lib/canDefineProperty.js": 12,
      "../../node_modules/react/lib/getIteratorFn.js": 13,
      "../../node_modules/react/react.js": 14,
      "../../node_modules/fbjs/lib/keyOf.js": 15,
      "../../node_modules/react/lib/PooledClass.js": 16,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 17,
      "../../node_modules/react/lib/ReactPropTypeLocations.js": 18,
      "../../node_modules/react/lib/ReactPropTypesSecret.js": 19,
      "../../node_modules/react/lib/traverseAllChildren.js": 20,
      "../../node_modules/react/lib/ReactChildren.js": 21,
      "../../node_modules/react/lib/ReactClass.js": 22,
      "../../node_modules/react/lib/ReactPropTypes.js": 23,
      "../../node_modules/react/lib/ReactVersion.js": 24,
      "../../node_modules/react-dom/index.js": 25,
      "../../node_modules/react/lib/React.js": 26,
      "../../node_modules/react/lib/ReactDOMFactories.js": 27,
      "../../node_modules/react/lib/ReactPureComponent.js": 28,
      "../../node_modules/react/lib/onlyChild.js": 29,
      "example.js": 30,
      "../../node_modules/react/lib/ReactDOMComponentTree.js": 31,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 32,
      "../../node_modules/react/lib/ReactInstrumentation.js": 33,
      "../../node_modules/react/lib/ReactUpdates.js": 34,
      "../../node_modules/react/lib/EventConstants.js": 35,
      "../../node_modules/react/lib/SyntheticEvent.js": 36,
      "../../node_modules/react/lib/DOMLazyTree.js": 37,
      "../../node_modules/react/lib/DOMProperty.js": 38,
      "../../node_modules/react/lib/ReactReconciler.js": 39,
      "../../node_modules/react/lib/EventPluginHub.js": 40,
      "../../node_modules/react/lib/EventPropagators.js": 41,
      "../../node_modules/react/lib/ReactInstanceMap.js": 42,
      "../../node_modules/react/lib/SyntheticUIEvent.js": 43,
      "../../node_modules/react/lib/Transaction.js": 44,
      "../../node_modules/react/lib/DisabledInputUtils.js": 45,
      "../../node_modules/react/lib/ReactBrowserEventEmitter.js": 46,
      "../../node_modules/react/lib/SyntheticMouseEvent.js": 47,
      "../../node_modules/react/lib/escapeTextContentForBrowser.js": 48,
      "../../node_modules/react/lib/setInnerHTML.js": 49,
      "../../node_modules/fbjs/lib/shallowEqual.js": 50,
      "../../node_modules/process/browser.js": 51,
      "../../node_modules/react/lib/DOMChildrenOperations.js": 52,
      "../../node_modules/react/lib/DOMNamespaces.js": 53,
      "../../node_modules/react/lib/EventPluginRegistry.js": 54,
      "../../node_modules/react/lib/EventPluginUtils.js": 55,
      "../../node_modules/react/lib/LinkedValueUtils.js": 56,
      "../../node_modules/react/lib/ReactComponentEnvironment.js": 57,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 58,
      "../../node_modules/react/lib/ReactErrorUtils.js": 59,
      "../../node_modules/react/lib/ReactUpdateQueue.js": 60,
      "../../node_modules/react/lib/createMicrosoftUnsafeLocalFunction.js": 61,
      "../../node_modules/react/lib/getEventCharCode.js": 62,
      "../../node_modules/react/lib/getEventModifierState.js": 63,
      "../../node_modules/react/lib/getEventTarget.js": 64,
      "../../node_modules/react/lib/isEventSupported.js": 65,
      "../../node_modules/react/lib/shouldUpdateReactComponent.js": 66,
      "../../node_modules/react/lib/validateDOMNesting.js": 67,
      "../../node_modules/fbjs/lib/EventListener.js": 68,
      "../../node_modules/fbjs/lib/focusNode.js": 69,
      "../../node_modules/fbjs/lib/getActiveElement.js": 70,
      "../../node_modules/react/lib/CSSProperty.js": 71,
      "../../node_modules/react/lib/CallbackQueue.js": 72,
      "../../node_modules/react/lib/DOMPropertyOperations.js": 73,
      "../../node_modules/react/lib/ReactDOMComponentFlags.js": 74,
      "../../node_modules/react/lib/ReactDOMSelect.js": 75,
      "../../node_modules/react/lib/ReactEmptyComponent.js": 76,
      "../../node_modules/react/lib/ReactFeatureFlags.js": 77,
      "../../node_modules/react/lib/ReactHostComponent.js": 78,
      "../../node_modules/react/lib/ReactInputSelection.js": 79,
      "../../node_modules/react/lib/ReactMount.js": 80,
      "../../node_modules/react/lib/ReactMultiChildUpdateTypes.js": 81,
      "../../node_modules/react/lib/ReactNodeTypes.js": 82,
      "../../node_modules/react/lib/ViewportMetrics.js": 83,
      "../../node_modules/react/lib/accumulateInto.js": 84,
      "../../node_modules/react/lib/forEachAccumulated.js": 85,
      "../../node_modules/react/lib/getHostComponentFromComposite.js": 86,
      "../../node_modules/react/lib/getTextContentAccessor.js": 87,
      "../../node_modules/react/lib/instantiateReactComponent.js": 88,
      "../../node_modules/react/lib/isTextInputElement.js": 89,
      "../../node_modules/react/lib/setTextContent.js": 90,
      "../../node_modules/fbjs/lib/camelize.js": 91,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 92,
      "../../node_modules/fbjs/lib/containsNode.js": 93,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 94,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 95,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 96,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 97,
      "../../node_modules/fbjs/lib/hyphenate.js": 98,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 99,
      "../../node_modules/fbjs/lib/isNode.js": 100,
      "../../node_modules/fbjs/lib/isTextNode.js": 101,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 102,
      "../../node_modules/react/lib/AutoFocusUtils.js": 103,
      "../../node_modules/react/lib/BeforeInputEventPlugin.js": 104,
      "../../node_modules/react/lib/CSSPropertyOperations.js": 105,
      "../../node_modules/react/lib/ChangeEventPlugin.js": 106,
      "../../node_modules/react/lib/Danger.js": 107,
      "../../node_modules/react/lib/DefaultEventPluginOrder.js": 108,
      "../../node_modules/react/lib/EnterLeaveEventPlugin.js": 109,
      "../../node_modules/react/lib/FallbackCompositionState.js": 110,
      "../../node_modules/react/lib/HTMLDOMPropertyConfig.js": 111,
      "../../node_modules/react/lib/ReactChildReconciler.js": 112,
      "../../node_modules/react/lib/ReactComponentBrowserEnvironment.js": 113,
      "../../node_modules/react/lib/ReactCompositeComponent.js": 114,
      "../../node_modules/react/lib/ReactDOM.js": 115,
      "../../node_modules/react/lib/ReactDOMButton.js": 116,
      "../../node_modules/react/lib/ReactDOMComponent.js": 117,
      "../../node_modules/react/lib/ReactDOMContainerInfo.js": 118,
      "../../node_modules/react/lib/ReactDOMEmptyComponent.js": 119,
      "../../node_modules/react/lib/ReactDOMFeatureFlags.js": 120,
      "../../node_modules/react/lib/ReactDOMIDOperations.js": 121,
      "../../node_modules/react/lib/ReactDOMInput.js": 122,
      "../../node_modules/react/lib/ReactDOMOption.js": 123,
      "../../node_modules/react/lib/ReactDOMSelection.js": 124,
      "../../node_modules/react/lib/ReactDOMTextComponent.js": 125,
      "../../node_modules/react/lib/ReactDOMTextarea.js": 126,
      "../../node_modules/react/lib/ReactDOMTreeTraversal.js": 127,
      "../../node_modules/react/lib/ReactDefaultBatchingStrategy.js": 128,
      "../../node_modules/react/lib/ReactDefaultInjection.js": 129,
      "../../node_modules/react/lib/ReactEventEmitterMixin.js": 130,
      "../../node_modules/react/lib/ReactEventListener.js": 131,
      "../../node_modules/react/lib/ReactInjection.js": 132,
      "../../node_modules/react/lib/ReactMarkupChecksum.js": 133,
      "../../node_modules/react/lib/ReactMultiChild.js": 134,
      "../../node_modules/react/lib/ReactOwner.js": 135,
      "../../node_modules/react/lib/ReactReconcileTransaction.js": 136,
      "../../node_modules/react/lib/ReactRef.js": 137,
      "../../node_modules/react/lib/ReactServerRenderingTransaction.js": 138,
      "../../node_modules/react/lib/ReactServerUpdateQueue.js": 139,
      "../../node_modules/react/lib/SVGDOMPropertyConfig.js": 140,
      "../../node_modules/react/lib/SelectEventPlugin.js": 141,
      "../../node_modules/react/lib/SimpleEventPlugin.js": 142,
      "../../node_modules/react/lib/SyntheticAnimationEvent.js": 143,
      "../../node_modules/react/lib/SyntheticClipboardEvent.js": 144,
      "../../node_modules/react/lib/SyntheticCompositionEvent.js": 145,
      "../../node_modules/react/lib/SyntheticDragEvent.js": 146,
      "../../node_modules/react/lib/SyntheticFocusEvent.js": 147,
      "../../node_modules/react/lib/SyntheticInputEvent.js": 148,
      "../../node_modules/react/lib/SyntheticKeyboardEvent.js": 149,
      "../../node_modules/react/lib/SyntheticTouchEvent.js": 150,
      "../../node_modules/react/lib/SyntheticTransitionEvent.js": 151,
      "../../node_modules/react/lib/SyntheticWheelEvent.js": 152,
      "../../node_modules/react/lib/adler32.js": 153,
      "../../node_modules/react/lib/checkReactTypeSpec.js": 154,
      "../../node_modules/react/lib/dangerousStyleValue.js": 155,
      "../../node_modules/react/lib/findDOMNode.js": 156,
      "../../node_modules/react/lib/flattenChildren.js": 157,
      "../../node_modules/react/lib/getEventKey.js": 158,
      "../../node_modules/react/lib/getNodeForCharacterOffset.js": 159,
      "../../node_modules/react/lib/getVendorPrefixedEventName.js": 160,
      "../../node_modules/react/lib/quoteAttributeValueForBrowser.js": 161,
      "../../node_modules/react/lib/renderSubtreeIntoContainer.js": 162
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      "11": 11,
      "12": 12,
      "13": 13,
      "14": 14,
      "15": 15,
      "16": 16,
      "17": 17,
      "18": 18,
      "19": 19,
      "20": 20,
      "21": 21,
      "22": 22,
      "23": 23,
      "24": 24,
      "25": 25,
      "26": 26,
      "27": 27,
      "28": 28,
      "29": 29,
      "30": 30,
      "31": 31,
      "32": 32,
      "33": 33,
      "34": 34,
      "35": 35,
      "36": 36,
      "37": 37,
      "38": 38,
      "39": 39,
      "40": 40,
      "41": 41,
      "42": 42,
      "43": 43,
      "44": 44,
      "45": 45,
      "46": 46,
      "47": 47,
      "48": 48,
      "49": 49,
      "50": 50,
      "51": 51,
      "52": 52,
      "53": 53,
      "54": 54,
      "55": 55,
      "56": 56,
      "57": 57,
      "58": 58,
      "59": 59,
      "60": 60,
      "61": 61,
      "62": 62,
      "63": 63,
      "64": 64,
      "65": 65,
      "66": 66,
      "67": 67,
      "68": 68,
      "69": 69,
      "70": 70,
      "71": 71,
      "72": 72,
      "73": 73,
      "74": 74,
      "75": 75,
      "76": 76,
      "77": 77,
      "78": 78,
      "79": 79,
      "80": 80,
      "81": 81,
      "82": 82,
      "83": 83,
      "84": 84,
      "85": 85,
      "86": 86,
      "87": 87,
      "88": 88,
      "89": 89,
      "90": 90,
      "91": 91,
      "92": 92,
      "93": 93,
      "94": 94,
      "95": 95,
      "96": 96,
      "97": 97,
      "98": 98,
      "99": 99,
      "100": 100,
      "101": 101,
      "102": 102,
      "103": 103,
      "104": 104,
      "105": 105,
      "106": 106,
      "107": 107,
      "108": 108,
      "109": 109,
      "110": 110,
      "111": 111,
      "112": 112,
      "113": 113,
      "114": 114,
      "115": 115,
      "116": 116,
      "117": 117,
      "118": 118,
      "119": 119,
      "120": 120,
      "121": 121,
      "122": 122,
      "123": 123,
      "124": 124,
      "125": 125,
      "126": 126,
      "127": 127,
      "128": 128,
      "129": 129,
      "130": 130,
      "131": 131,
      "132": 132,
      "133": 133,
      "134": 134,
      "135": 135,
      "136": 136,
      "137": 137,
      "138": 138,
      "139": 139,
      "140": 140,
      "141": 141,
      "142": 142,
      "143": 143,
      "144": 144,
      "145": 145,
      "146": 146,
      "147": 147,
      "148": 148,
      "149": 149,
      "150": 150,
      "151": 151,
      "152": 152,
      "153": 153,
      "154": 154,
      "155": 155,
      "156": 156,
      "157": 157,
      "158": 158,
      "159": 159,
      "160": 160,
      "161": 161,
      "162": 162
    }
  },
  "chunks": {
    "byName": {},
    "byBlocks": {
      "example.js:0/0:5": 0,
      "example.js:0/0:10": 1,
      "example.js:0/0:11": 2,
      "example.js:0/0:4": 3,
      "example.js:0/0:2": 4,
      "example.js:0/0:0": 5,
      "example.js:0/0:3": 6,
      "example.js:0/0:1": 7,
      "example.js:0/0:7": 8,
      "example.js:0/0:6": 9,
      "example.js:0/0:8": 10,
      "example.js:0/0:9": 11
    },
    "usedIds": {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      "11": 11,
      "12": 12,
      "13": 13,
      "14": 14
    }
  },
  "aggressiveSplits": [
    {
      "modules": [
        "../../node_modules/fbjs/lib/EventListener.js",
        "../../node_modules/fbjs/lib/ExecutionEnvironment.js",
        "../../node_modules/fbjs/lib/camelize.js",
        "../../node_modules/fbjs/lib/camelizeStyleName.js",
        "../../node_modules/fbjs/lib/containsNode.js",
        "../../node_modules/fbjs/lib/createArrayFromMixed.js",
        "../../node_modules/fbjs/lib/createNodesFromMarkup.js",
        "../../node_modules/fbjs/lib/focusNode.js",
        "../../node_modules/fbjs/lib/getActiveElement.js",
        "../../node_modules/fbjs/lib/getMarkupWrap.js",
        "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js",
        "../../node_modules/fbjs/lib/hyphenate.js",
        "../../node_modules/fbjs/lib/hyphenateStyleName.js",
        "../../node_modules/fbjs/lib/isNode.js",
        "../../node_modules/fbjs/lib/isTextNode.js",
        "../../node_modules/fbjs/lib/memoizeStringOnly.js",
        "../../node_modules/fbjs/lib/shallowEqual.js",
        "../../node_modules/process/browser.js",
        "../../node_modules/react-dom/index.js",
        "../../node_modules/react/lib/AutoFocusUtils.js",
        "../../node_modules/react/lib/BeforeInputEventPlugin.js",
        "../../node_modules/react/lib/CSSProperty.js",
        "../../node_modules/react/lib/DOMNamespaces.js",
        "../../node_modules/react/lib/DefaultEventPluginOrder.js"
      ],
      "hash": "23210448cb21fea3eeb2aa91549fe38e",
      "id": 0
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactDOMSelection.js",
        "../../node_modules/react/lib/ReactDOMTextComponent.js",
        "../../node_modules/react/lib/ReactDOMTextarea.js",
        "../../node_modules/react/lib/ReactDOMTreeTraversal.js",
        "../../node_modules/react/lib/ReactDefaultInjection.js",
        "../../node_modules/react/lib/ReactEmptyComponent.js",
        "../../node_modules/react/lib/ReactErrorUtils.js",
        "../../node_modules/react/lib/ReactEventEmitterMixin.js",
        "../../node_modules/react/lib/ReactEventListener.js",
        "../../node_modules/react/lib/ReactFeatureFlags.js",
        "../../node_modules/react/lib/ReactHostComponent.js",
        "../../node_modules/react/lib/ReactInjection.js",
        "../../node_modules/react/lib/ReactInputSelection.js",
        "../../node_modules/react/lib/ReactInstanceMap.js",
        "../../node_modules/react/lib/ReactMarkupChecksum.js",
        "../../node_modules/react/lib/ReactMultiChildUpdateTypes.js",
        "../../node_modules/react/lib/ReactNodeTypes.js",
        "../../node_modules/react/lib/ViewportMetrics.js"
      ],
      "hash": "016a66632ae5537cd481ea0b3090b076",
      "id": 1
    },
    {
      "modules": [
        "../../node_modules/react/lib/SimpleEventPlugin.js",
        "../../node_modules/react/lib/SyntheticClipboardEvent.js",
        "../../node_modules/react/lib/SyntheticCompositionEvent.js",
        "../../node_modules/react/lib/SyntheticDragEvent.js",
        "../../node_modules/react/lib/SyntheticEvent.js",
        "../../node_modules/react/lib/SyntheticFocusEvent.js",
        "../../node_modules/react/lib/SyntheticInputEvent.js",
        "../../node_modules/react/lib/SyntheticKeyboardEvent.js",
        "../../node_modules/react/lib/SyntheticMouseEvent.js",
        "../../node_modules/react/lib/SyntheticTouchEvent.js",
        "../../node_modules/react/lib/SyntheticTransitionEvent.js",
        "../../node_modules/react/lib/SyntheticUIEvent.js",
        "../../node_modules/react/lib/SyntheticWheelEvent.js",
        "../../node_modules/react/lib/accumulateInto.js",
        "../../node_modules/react/lib/adler32.js",
        "../../node_modules/react/lib/createMicrosoftUnsafeLocalFunction.js",
        "../../node_modules/react/lib/forEachAccumulated.js"
      ],
      "hash": "4e18f0d2e308513b14176e12ad5fc16a",
      "id": 2
    },
    {
      "modules": [
        "../../node_modules/react/lib/getEventModifierState.js",
        "../../node_modules/react/lib/getEventTarget.js",
        "../../node_modules/react/lib/getNodeForCharacterOffset.js",
        "../../node_modules/react/lib/getTextContentAccessor.js",
        "../../node_modules/react/lib/getVendorPrefixedEventName.js",
        "../../node_modules/react/lib/instantiateReactComponent.js",
        "../../node_modules/react/lib/isEventSupported.js",
        "../../node_modules/react/lib/isTextInputElement.js",
        "../../node_modules/react/lib/quoteAttributeValueForBrowser.js",
        "../../node_modules/react/lib/renderSubtreeIntoContainer.js",
        "../../node_modules/react/lib/setInnerHTML.js",
        "../../node_modules/react/lib/setTextContent.js",
        "../../node_modules/react/lib/shouldUpdateReactComponent.js",
        "../../node_modules/react/lib/validateDOMNesting.js"
      ],
      "hash": "b666bfb4baf02f3293a0a3b8572c3e5f",
      "id": 3
    },
    {
      "modules": [
        "../../node_modules/react/lib/DisabledInputUtils.js",
        "../../node_modules/react/lib/EnterLeaveEventPlugin.js",
        "../../node_modules/react/lib/EventConstants.js",
        "../../node_modules/react/lib/EventPluginHub.js",
        "../../node_modules/react/lib/EventPluginRegistry.js",
        "../../node_modules/react/lib/EventPluginUtils.js",
        "../../node_modules/react/lib/EventPropagators.js",
        "../../node_modules/react/lib/FallbackCompositionState.js",
        "../../node_modules/react/lib/HTMLDOMPropertyConfig.js",
        "../../node_modules/react/lib/ReactComponentBrowserEnvironment.js",
        "../../node_modules/react/lib/ReactComponentEnvironment.js",
        "../../node_modules/react/lib/ReactDOMButton.js",
        "../../node_modules/react/lib/ReactDOMComponentFlags.js",
        "../../node_modules/react/lib/ReactDOMFeatureFlags.js"
      ],
      "hash": "b30ba15ed694bb94bdb2845fb93f2bbb",
      "id": 4
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactReconciler.js",
        "../../node_modules/react/lib/ReactRef.js",
        "../../node_modules/react/lib/ReactServerRenderingTransaction.js",
        "../../node_modules/react/lib/ReactServerUpdateQueue.js",
        "../../node_modules/react/lib/ReactUpdateQueue.js",
        "../../node_modules/react/lib/ReactUpdates.js",
        "../../node_modules/react/lib/SVGDOMPropertyConfig.js",
        "../../node_modules/react/lib/SelectEventPlugin.js",
        "../../node_modules/react/lib/SyntheticAnimationEvent.js"
      ],
      "hash": "16c333f8d4014b9a685c9ea890b3cef3",
      "id": 5
    },
    {
      "modules": [
        "../../node_modules/react/lib/LinkedValueUtils.js",
        "../../node_modules/react/lib/ReactBrowserEventEmitter.js",
        "../../node_modules/react/lib/ReactChildReconciler.js",
        "../../node_modules/react/lib/ReactComponentTreeHook.js",
        "../../node_modules/react/lib/ReactDOM.js",
        "../../node_modules/react/lib/ReactDOMComponentTree.js",
        "../../node_modules/react/lib/ReactDOMContainerInfo.js",
        "../../node_modules/react/lib/ReactDOMEmptyComponent.js",
        "../../node_modules/react/lib/ReactDOMIDOperations.js"
      ],
      "hash": "041fe45e13f7a2a07bab8b41616b68c2",
      "id": 6
    },
    {
      "modules": [
        "../../node_modules/react/lib/Transaction.js",
        "../../node_modules/react/lib/checkReactTypeSpec.js",
        "../../node_modules/react/lib/dangerousStyleValue.js",
        "../../node_modules/react/lib/escapeTextContentForBrowser.js",
        "../../node_modules/react/lib/findDOMNode.js",
        "../../node_modules/react/lib/flattenChildren.js",
        "../../node_modules/react/lib/getEventCharCode.js",
        "../../node_modules/react/lib/getEventKey.js"
      ],
      "hash": "1f4709ab95bd7ea9c3e0d21accac81c9",
      "id": 7
    },
    {
      "modules": [
        "../../node_modules/react/lib/CSSPropertyOperations.js",
        "../../node_modules/react/lib/CallbackQueue.js",
        "../../node_modules/react/lib/ChangeEventPlugin.js",
        "../../node_modules/react/lib/DOMChildrenOperations.js",
        "../../node_modules/react/lib/DOMLazyTree.js",
        "../../node_modules/react/lib/DOMProperty.js",
        "../../node_modules/react/lib/DOMPropertyOperations.js",
        "../../node_modules/react/lib/Danger.js"
      ],
      "hash": "b10a81c1d9710eac5d86ced4a99e72b7",
      "id": 8
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactMount.js",
        "../../node_modules/react/lib/ReactMultiChild.js",
        "../../node_modules/react/lib/ReactOwner.js",
        "../../node_modules/react/lib/ReactReconcileTransaction.js",
        "../../node_modules/react/lib/getHostComponentFromComposite.js"
      ],
      "hash": "8cbc6e8d682eb80603a55f537ecbf8f2",
      "id": 9
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactCompositeComponent.js",
        "../../node_modules/react/lib/ReactDOMInput.js",
        "../../node_modules/react/lib/ReactDefaultBatchingStrategy.js",
        "../../node_modules/react/lib/ReactInstrumentation.js"
      ],
      "hash": "06afeb557cc6ef65a8f01d24a405bf1b",
      "id": 10
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactDOMComponent.js",
        "../../node_modules/react/lib/ReactDOMOption.js",
        "../../node_modules/react/lib/ReactDOMSelect.js"
      ],
      "hash": "ab283bc97ca37bbe1a90a5a2b5ba0744",
      "id": 11
    },
    {
      "modules": [
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/fbjs/lib/keyMirror.js",
        "../../node_modules/fbjs/lib/keyOf.js",
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/React.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/react/lib/ReactComponent.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/react/lib/ReactDOMFactories.js",
        "../../node_modules/react/lib/ReactElement.js",
        "../../node_modules/react/lib/ReactNoopUpdateQueue.js",
        "../../node_modules/react/lib/ReactPropTypeLocationNames.js"
      ],
      "hash": "6f64f3546f2ce353e67270ae0c98561e",
      "id": 12
    }
  ]
}
```
