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
	mode: "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
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
Hash: 855e92ac8cd05846cd47
Version: webpack next
                  Asset      Size  Chunks             Chunk Names
49eabe0be9b855a6ece3.js  52.5 KiB       7  [emitted]  
c11db784679b537a5d1b.js  60.8 KiB       0  [emitted]  
4ec863f864133b7db4c3.js  55.6 KiB       2  [emitted]  
a52b878529cda333614e.js  53.9 KiB       3  [emitted]  
2020cd642caa01ec1e86.js  53.5 KiB       4  [emitted]  
23c4c0d48e8b38e2a9ea.js  52.8 KiB       5  [emitted]  
acbadebce580eb634bb7.js  22.8 KiB       6  [emitted]  
727a2eb4c7cff3f84596.js  58.3 KiB       1  [emitted]  
fd3f47121db53fb3037b.js  51.8 KiB       8  [emitted]  
1d590e6c5541be02dd36.js  51.5 KiB       9  [emitted]  
e169ea4c146b4e5d51c0.js  50.4 KiB      10  [emitted]  
0633f8f465e2cabc39b5.js  32.6 KiB      11  [emitted]  
940defd566cc7edba267.js  61.4 KiB      12  [emitted]  
e298620d755cc0f292cf.js  37.6 KiB      13  [emitted]  
1d08b68310160ad06455.js  31.9 KiB      14  [emitted]  
Entrypoint main = 940defd566cc7edba267.js 1d08b68310160ad06455.js e298620d755cc0f292cf.js
chunk    {0} c11db784679b537a5d1b.js 48.5 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    28 modules
chunk    {1} 727a2eb4c7cff3f84596.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    24 modules
chunk    {2} 4ec863f864133b7db4c3.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    15 modules
chunk    {3} a52b878529cda333614e.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    11 modules
chunk    {4} 2020cd642caa01ec1e86.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    11 modules
chunk    {5} 23c4c0d48e8b38e2a9ea.js 48.6 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    10 modules
chunk    {6} acbadebce580eb634bb7.js 18.9 KiB {12} {13} {14} [rendered]
    > aggressive-splitted [14] ./example.js 2:0-22
    9 modules
chunk    {7} 49eabe0be9b855a6ece3.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    9 modules
chunk    {8} fd3f47121db53fb3037b.js 48.6 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    7 modules
chunk    {9} 1d590e6c5541be02dd36.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    6 modules
chunk   {10} e169ea4c146b4e5d51c0.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    6 modules
chunk   {11} 0633f8f465e2cabc39b5.js 31.4 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    3 modules
chunk   {12} 940defd566cc7edba267.js 48.8 KiB [entry] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    16 modules
chunk   {13} e298620d755cc0f292cf.js 32.4 KiB [initial] [rendered]
    > aggressive-splitted main [14] ./example.js 
   [14] ./example.js 44 bytes {13} [built]
     + 11 hidden modules
chunk   {14} 1d08b68310160ad06455.js 30.5 KiB [initial] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    3 modules
```

## Minimized (uglify-js, no zip)

```
Hash: 855e92ac8cd05846cd47
Version: webpack next
                  Asset      Size  Chunks             Chunk Names
49eabe0be9b855a6ece3.js  7.53 KiB       7  [emitted]  
c11db784679b537a5d1b.js  9.32 KiB       0  [emitted]  
4ec863f864133b7db4c3.js  10.9 KiB       2  [emitted]  
a52b878529cda333614e.js  10.7 KiB       3  [emitted]  
2020cd642caa01ec1e86.js  9.98 KiB       4  [emitted]  
23c4c0d48e8b38e2a9ea.js  12.1 KiB       5  [emitted]  
acbadebce580eb634bb7.js  4.93 KiB       6  [emitted]  
727a2eb4c7cff3f84596.js    13 KiB       1  [emitted]  
fd3f47121db53fb3037b.js  15.3 KiB       8  [emitted]  
1d590e6c5541be02dd36.js  12.6 KiB       9  [emitted]  
e169ea4c146b4e5d51c0.js  11.2 KiB      10  [emitted]  
0633f8f465e2cabc39b5.js  5.02 KiB      11  [emitted]  
940defd566cc7edba267.js  10.4 KiB      12  [emitted]  
e298620d755cc0f292cf.js  5.96 KiB      13  [emitted]  
1d08b68310160ad06455.js  7.17 KiB      14  [emitted]  
Entrypoint main = 940defd566cc7edba267.js 1d08b68310160ad06455.js e298620d755cc0f292cf.js
chunk    {0} c11db784679b537a5d1b.js 48.5 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    28 modules
chunk    {1} 727a2eb4c7cff3f84596.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    24 modules
chunk    {2} 4ec863f864133b7db4c3.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    15 modules
chunk    {3} a52b878529cda333614e.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    11 modules
chunk    {4} 2020cd642caa01ec1e86.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    11 modules
chunk    {5} 23c4c0d48e8b38e2a9ea.js 48.6 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    10 modules
chunk    {6} acbadebce580eb634bb7.js 18.9 KiB {12} {13} {14} [rendered]
    > aggressive-splitted [14] ./example.js 2:0-22
    9 modules
chunk    {7} 49eabe0be9b855a6ece3.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    9 modules
chunk    {8} fd3f47121db53fb3037b.js 48.6 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    7 modules
chunk    {9} 1d590e6c5541be02dd36.js 48.7 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    6 modules
chunk   {10} e169ea4c146b4e5d51c0.js 48.8 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    6 modules
chunk   {11} 0633f8f465e2cabc39b5.js 31.4 KiB {12} {13} {14} [rendered] [recorded]
    > aggressive-splitted [14] ./example.js 2:0-22
    3 modules
chunk   {12} 940defd566cc7edba267.js 48.8 KiB [entry] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    16 modules
chunk   {13} e298620d755cc0f292cf.js 32.4 KiB [initial] [rendered]
    > aggressive-splitted main [14] ./example.js 
   [14] ./example.js 44 bytes {13} [built]
     + 11 hidden modules
chunk   {14} 1d08b68310160ad06455.js 30.5 KiB [initial] [rendered] [recorded]
    > aggressive-splitted main [14] ./example.js 
    3 modules
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "../../node_modules/fbjs/lib/invariant.js": 0,
      "../../node_modules/react/lib/ReactElement.js": 1,
      "../../node_modules/object-assign/index.js": 2,
      "../../node_modules/fbjs/lib/warning.js": 3,
      "../../node_modules/react/lib/reactProdInvariant.js": 4,
      "../../node_modules/fbjs/lib/emptyFunction.js": 5,
      "../../node_modules/react/lib/ReactCurrentOwner.js": 6,
      "../../node_modules/fbjs/lib/emptyObject.js": 7,
      "../../node_modules/react/lib/ReactBaseClasses.js": 8,
      "../../node_modules/react/lib/ReactNoopUpdateQueue.js": 9,
      "../../node_modules/react/lib/canDefineProperty.js": 10,
      "../../node_modules/react/lib/ReactElementSymbol.js": 11,
      "../../node_modules/react/lib/React.js": 12,
      "../../node_modules/prop-types/factory.js": 13,
      "example.js": 14,
      "../../node_modules/react/react.js": 15,
      "../../node_modules/react/lib/lowPriorityWarning.js": 16,
      "../../node_modules/react/lib/ReactChildren.js": 17,
      "../../node_modules/react/lib/PooledClass.js": 18,
      "../../node_modules/react/lib/traverseAllChildren.js": 19,
      "../../node_modules/react/lib/getIteratorFn.js": 20,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 21,
      "../../node_modules/react/lib/ReactDOMFactories.js": 22,
      "../../node_modules/react/lib/ReactPropTypes.js": 23,
      "../../node_modules/prop-types/factoryWithTypeCheckers.js": 24,
      "../../node_modules/prop-types/lib/ReactPropTypesSecret.js": 25,
      "../../node_modules/prop-types/checkPropTypes.js": 26,
      "../../node_modules/react/lib/ReactVersion.js": 27,
      "../../node_modules/react/lib/createClass.js": 28,
      "../../node_modules/create-react-class/factory.js": 29,
      "../../node_modules/react/lib/onlyChild.js": 30,
      "../../node_modules/react-dom/index.js": 31,
      "../../node_modules/react-dom/lib/reactProdInvariant.js": 32,
      "../../node_modules/react-dom/lib/ReactDOMComponentTree.js": 33,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 34,
      "../../node_modules/react-dom/lib/ReactInstrumentation.js": 35,
      "../../node_modules/react-dom/lib/ReactUpdates.js": 36,
      "../../node_modules/react-dom/lib/SyntheticEvent.js": 37,
      "../../node_modules/react-dom/lib/PooledClass.js": 38,
      "../../node_modules/react-dom/lib/DOMProperty.js": 39,
      "../../node_modules/react-dom/lib/ReactReconciler.js": 40,
      "../../node_modules/react-dom/lib/DOMLazyTree.js": 41,
      "../../node_modules/react-dom/lib/EventPropagators.js": 42,
      "../../node_modules/react-dom/lib/EventPluginHub.js": 43,
      "../../node_modules/react-dom/lib/SyntheticUIEvent.js": 44,
      "../../node_modules/react-dom/lib/ReactInstanceMap.js": 45,
      "../../node_modules/react-dom/lib/Transaction.js": 46,
      "../../node_modules/react-dom/lib/SyntheticMouseEvent.js": 47,
      "../../node_modules/react-dom/lib/setInnerHTML.js": 48,
      "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js": 49,
      "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js": 50,
      "../../node_modules/react-dom/lib/EventPluginRegistry.js": 51,
      "../../node_modules/react-dom/lib/EventPluginUtils.js": 52,
      "../../node_modules/react-dom/lib/ReactErrorUtils.js": 53,
      "../../node_modules/react-dom/lib/getEventTarget.js": 54,
      "../../node_modules/react-dom/lib/isEventSupported.js": 55,
      "../../node_modules/react-dom/lib/getEventModifierState.js": 56,
      "../../node_modules/react-dom/lib/DOMChildrenOperations.js": 57,
      "../../node_modules/react-dom/lib/DOMNamespaces.js": 58,
      "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js": 59,
      "../../node_modules/react-dom/lib/LinkedValueUtils.js": 60,
      "../../node_modules/react-dom/lib/ReactComponentEnvironment.js": 61,
      "../../node_modules/fbjs/lib/shallowEqual.js": 62,
      "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js": 63,
      "../../node_modules/react-dom/lib/KeyEscapeUtils.js": 64,
      "../../node_modules/react-dom/lib/ReactUpdateQueue.js": 65,
      "../../node_modules/react-dom/lib/validateDOMNesting.js": 66,
      "../../node_modules/react-dom/lib/getEventCharCode.js": 67,
      "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js": 68,
      "../../node_modules/react-dom/lib/accumulateInto.js": 69,
      "../../node_modules/react-dom/lib/forEachAccumulated.js": 70,
      "../../node_modules/react-dom/lib/getTextContentAccessor.js": 71,
      "../../node_modules/react-dom/lib/CallbackQueue.js": 72,
      "../../node_modules/react-dom/lib/ReactFeatureFlags.js": 73,
      "../../node_modules/react-dom/lib/inputValueTracking.js": 74,
      "../../node_modules/react-dom/lib/isTextInputElement.js": 75,
      "../../node_modules/react-dom/lib/ViewportMetrics.js": 76,
      "../../node_modules/react-dom/lib/setTextContent.js": 77,
      "../../node_modules/fbjs/lib/focusNode.js": 78,
      "../../node_modules/react-dom/lib/CSSProperty.js": 79,
      "../../node_modules/react-dom/lib/DOMPropertyOperations.js": 80,
      "../../node_modules/react-dom/lib/ReactDOMSelect.js": 81,
      "../../node_modules/process/browser.js": 82,
      "../../node_modules/react-dom/lib/instantiateReactComponent.js": 83,
      "../../node_modules/react-dom/lib/ReactNodeTypes.js": 84,
      "../../node_modules/react-dom/lib/ReactEmptyComponent.js": 85,
      "../../node_modules/react-dom/lib/ReactHostComponent.js": 86,
      "../../node_modules/react-dom/lib/traverseAllChildren.js": 87,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 88,
      "../../node_modules/fbjs/lib/EventListener.js": 89,
      "../../node_modules/react-dom/lib/ReactInputSelection.js": 90,
      "../../node_modules/fbjs/lib/getActiveElement.js": 91,
      "../../node_modules/react-dom/lib/ReactMount.js": 92,
      "../../node_modules/react-dom/lib/getHostComponentFromComposite.js": 93,
      "../../node_modules/react-dom/lib/ReactDOM.js": 94,
      "../../node_modules/react-dom/lib/ReactDefaultInjection.js": 95,
      "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js": 96,
      "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js": 97,
      "../../node_modules/react-dom/lib/FallbackCompositionState.js": 98,
      "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js": 99,
      "../../node_modules/react-dom/lib/SyntheticInputEvent.js": 100,
      "../../node_modules/react-dom/lib/ChangeEventPlugin.js": 101,
      "../../node_modules/react-dom/lib/ReactRef.js": 102,
      "../../node_modules/react-dom/lib/ReactOwner.js": 103,
      "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js": 104,
      "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js": 105,
      "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js": 106,
      "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js": 107,
      "../../node_modules/react-dom/lib/Danger.js": 108,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 109,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 110,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 111,
      "../../node_modules/react-dom/lib/ReactDOMIDOperations.js": 112,
      "../../node_modules/react-dom/lib/ReactDOMComponent.js": 113,
      "../../node_modules/react-dom/lib/AutoFocusUtils.js": 114,
      "../../node_modules/react-dom/lib/CSSPropertyOperations.js": 115,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 116,
      "../../node_modules/fbjs/lib/camelize.js": 117,
      "../../node_modules/react-dom/lib/dangerousStyleValue.js": 118,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 119,
      "../../node_modules/fbjs/lib/hyphenate.js": 120,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 121,
      "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js": 122,
      "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js": 123,
      "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js": 124,
      "../../node_modules/react-dom/lib/ReactDOMInput.js": 125,
      "../../node_modules/react-dom/lib/ReactPropTypesSecret.js": 126,
      "../../node_modules/react-dom/lib/ReactDOMOption.js": 127,
      "../../node_modules/react-dom/lib/ReactDOMTextarea.js": 128,
      "../../node_modules/react-dom/lib/ReactMultiChild.js": 129,
      "../../node_modules/react-dom/lib/ReactChildReconciler.js": 130,
      "../../node_modules/react-dom/lib/ReactCompositeComponent.js": 131,
      "../../node_modules/react/lib/getNextDebugID.js": 132,
      "../../node_modules/react-dom/lib/ReactElementSymbol.js": 133,
      "../../node_modules/react-dom/lib/getIteratorFn.js": 134,
      "../../node_modules/react-dom/lib/flattenChildren.js": 135,
      "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js": 136,
      "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js": 137,
      "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js": 138,
      "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js": 139,
      "../../node_modules/react-dom/lib/ReactDOMTextComponent.js": 140,
      "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js": 141,
      "../../node_modules/react-dom/lib/ReactEventListener.js": 142,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 143,
      "../../node_modules/react-dom/lib/ReactInjection.js": 144,
      "../../node_modules/react-dom/lib/ReactReconcileTransaction.js": 145,
      "../../node_modules/react-dom/lib/ReactDOMSelection.js": 146,
      "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js": 147,
      "../../node_modules/fbjs/lib/containsNode.js": 148,
      "../../node_modules/fbjs/lib/isTextNode.js": 149,
      "../../node_modules/fbjs/lib/isNode.js": 150,
      "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js": 151,
      "../../node_modules/react-dom/lib/SelectEventPlugin.js": 152,
      "../../node_modules/react-dom/lib/SimpleEventPlugin.js": 153,
      "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js": 154,
      "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js": 155,
      "../../node_modules/react-dom/lib/SyntheticFocusEvent.js": 156,
      "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js": 157,
      "../../node_modules/react-dom/lib/getEventKey.js": 158,
      "../../node_modules/react-dom/lib/SyntheticDragEvent.js": 159,
      "../../node_modules/react-dom/lib/SyntheticTouchEvent.js": 160,
      "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js": 161,
      "../../node_modules/react-dom/lib/SyntheticWheelEvent.js": 162,
      "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js": 163,
      "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js": 164,
      "../../node_modules/react-dom/lib/ReactMarkupChecksum.js": 165,
      "../../node_modules/react-dom/lib/adler32.js": 166,
      "../../node_modules/react-dom/lib/ReactVersion.js": 167,
      "../../node_modules/react-dom/lib/findDOMNode.js": 168,
      "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js": 169
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
      "162": 162,
      "163": 163,
      "164": 164,
      "165": 165,
      "166": 166,
      "167": 167,
      "168": 168,
      "169": 169
    }
  },
  "chunks": {
    "byName": {},
    "byBlocks": {
      "example.js:0/0:0": 0,
      "example.js:0/0:1": 1,
      "example.js:0/0:2": 2,
      "example.js:0/0:3": 3,
      "example.js:0/0:4": 4,
      "example.js:0/0:5": 5,
      "example.js:0/0:6": 6,
      "example.js:0/0:7": 7,
      "example.js:0/0:8": 8,
      "example.js:0/0:9": 9,
      "example.js:0/0:10": 10,
      "example.js:0/0:11": 11
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
        "../../node_modules/react-dom/lib/SyntheticUIEvent.js",
        "../../node_modules/react-dom/lib/Transaction.js",
        "../../node_modules/react-dom/lib/SyntheticMouseEvent.js",
        "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js",
        "../../node_modules/react-dom/lib/getEventTarget.js",
        "../../node_modules/react-dom/lib/isEventSupported.js",
        "../../node_modules/react-dom/lib/getEventModifierState.js",
        "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js",
        "../../node_modules/react-dom/lib/getEventCharCode.js",
        "../../node_modules/react-dom/lib/accumulateInto.js",
        "../../node_modules/react-dom/lib/forEachAccumulated.js",
        "../../node_modules/react-dom/lib/getTextContentAccessor.js",
        "../../node_modules/react-dom/lib/ViewportMetrics.js",
        "../../node_modules/react-dom/lib/getHostComponentFromComposite.js",
        "../../node_modules/react-dom/lib/SyntheticInputEvent.js",
        "../../node_modules/react-dom/lib/dangerousStyleValue.js",
        "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js",
        "../../node_modules/react-dom/lib/getIteratorFn.js",
        "../../node_modules/react-dom/lib/flattenChildren.js",
        "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js",
        "../../node_modules/react-dom/lib/SyntheticFocusEvent.js",
        "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js",
        "../../node_modules/react-dom/lib/getEventKey.js",
        "../../node_modules/react-dom/lib/SyntheticTouchEvent.js",
        "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js",
        "../../node_modules/react-dom/lib/SyntheticWheelEvent.js",
        "../../node_modules/react-dom/lib/adler32.js",
        "../../node_modules/react-dom/lib/findDOMNode.js"
      ],
      "hash": "c11db784679b537a5d1bd2f8c085327f",
      "id": 0
    },
    {
      "modules": [
        "../../node_modules/react-dom/index.js",
        "../../node_modules/fbjs/lib/ExecutionEnvironment.js",
        "../../node_modules/fbjs/lib/shallowEqual.js",
        "../../node_modules/react-dom/lib/CallbackQueue.js",
        "../../node_modules/fbjs/lib/focusNode.js",
        "../../node_modules/react-dom/lib/CSSProperty.js",
        "../../node_modules/process/browser.js",
        "../../node_modules/fbjs/lib/EventListener.js",
        "../../node_modules/fbjs/lib/getActiveElement.js",
        "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js",
        "../../node_modules/fbjs/lib/createNodesFromMarkup.js",
        "../../node_modules/fbjs/lib/createArrayFromMixed.js",
        "../../node_modules/fbjs/lib/getMarkupWrap.js",
        "../../node_modules/react-dom/lib/AutoFocusUtils.js",
        "../../node_modules/fbjs/lib/camelizeStyleName.js",
        "../../node_modules/fbjs/lib/camelize.js",
        "../../node_modules/fbjs/lib/hyphenateStyleName.js",
        "../../node_modules/fbjs/lib/hyphenate.js",
        "../../node_modules/fbjs/lib/memoizeStringOnly.js",
        "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js",
        "../../node_modules/fbjs/lib/containsNode.js",
        "../../node_modules/fbjs/lib/isTextNode.js",
        "../../node_modules/fbjs/lib/isNode.js"
      ],
      "hash": "727a2eb4c7cff3f84596628e983f3723",
      "id": 1
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactInstrumentation.js",
        "../../node_modules/react-dom/lib/ReactInstanceMap.js",
        "../../node_modules/react-dom/lib/ReactErrorUtils.js",
        "../../node_modules/react-dom/lib/ReactNodeTypes.js",
        "../../node_modules/react-dom/lib/ReactHostComponent.js",
        "../../node_modules/react-dom/lib/ReactInputSelection.js",
        "../../node_modules/react-dom/lib/ReactDefaultInjection.js",
        "../../node_modules/react-dom/lib/ReactRef.js",
        "../../node_modules/react-dom/lib/ReactDOMTextarea.js",
        "../../node_modules/react-dom/lib/ReactMultiChild.js",
        "../../node_modules/react-dom/lib/ReactDOMTextComponent.js",
        "../../node_modules/react-dom/lib/ReactEventListener.js",
        "../../node_modules/react-dom/lib/ReactMarkupChecksum.js",
        "../../node_modules/react-dom/lib/ReactVersion.js",
        "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js"
      ],
      "hash": "4ec863f864133b7db4c395d94189fadd",
      "id": 2
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMComponentTree.js",
        "../../node_modules/react-dom/lib/PooledClass.js",
        "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js",
        "../../node_modules/react-dom/lib/ReactDOM.js",
        "../../node_modules/react-dom/lib/ReactDOMIDOperations.js",
        "../../node_modules/react-dom/lib/ReactDOMInput.js",
        "../../node_modules/react-dom/lib/ReactPropTypesSecret.js",
        "../../node_modules/react-dom/lib/ReactChildReconciler.js",
        "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js",
        "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js"
      ],
      "hash": "a52b878529cda333614e59a191d58874",
      "id": 3
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/DOMProperty.js",
        "../../node_modules/react-dom/lib/DOMLazyTree.js",
        "../../node_modules/react-dom/lib/DOMChildrenOperations.js",
        "../../node_modules/react-dom/lib/DOMNamespaces.js",
        "../../node_modules/react-dom/lib/KeyEscapeUtils.js",
        "../../node_modules/react-dom/lib/DOMPropertyOperations.js",
        "../../node_modules/react-dom/lib/ChangeEventPlugin.js",
        "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js",
        "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js",
        "../../node_modules/react-dom/lib/Danger.js",
        "../../node_modules/react-dom/lib/CSSPropertyOperations.js"
      ],
      "hash": "2020cd642caa01ec1e86d311cd66e0a0",
      "id": 4
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/EventPropagators.js",
        "../../node_modules/react-dom/lib/EventPluginHub.js",
        "../../node_modules/react-dom/lib/EventPluginRegistry.js",
        "../../node_modules/react-dom/lib/EventPluginUtils.js",
        "../../node_modules/react-dom/lib/LinkedValueUtils.js",
        "../../node_modules/react-dom/lib/ReactComponentEnvironment.js",
        "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js",
        "../../node_modules/react-dom/lib/FallbackCompositionState.js",
        "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js",
        "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js"
      ],
      "hash": "23c4c0d48e8b38e2a9eaa3b97dec5b01",
      "id": 5
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactReconciler.js",
        "../../node_modules/react-dom/lib/ReactMount.js",
        "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js",
        "../../node_modules/react-dom/lib/ReactOwner.js",
        "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js",
        "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js",
        "../../node_modules/react-dom/lib/ReactReconcileTransaction.js",
        "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js",
        "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js"
      ],
      "hash": "49eabe0be9b855a6ece36ad0a7533349",
      "id": 7
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactUpdates.js",
        "../../node_modules/react-dom/lib/SyntheticEvent.js",
        "../../node_modules/react-dom/lib/ReactUpdateQueue.js",
        "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/SelectEventPlugin.js",
        "../../node_modules/react-dom/lib/SimpleEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticDragEvent.js"
      ],
      "hash": "fd3f47121db53fb3037b20e2894596cd",
      "id": 8
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMComponent.js",
        "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js",
        "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js",
        "../../node_modules/react-dom/lib/ReactInjection.js",
        "../../node_modules/react-dom/lib/ReactDOMSelection.js"
      ],
      "hash": "1d590e6c5541be02dd3651e08459eeaf",
      "id": 9
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactDOMSelect.js",
        "../../node_modules/react-dom/lib/ReactDOMOption.js",
        "../../node_modules/react-dom/lib/ReactCompositeComponent.js",
        "../../node_modules/react-dom/lib/ReactElementSymbol.js",
        "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js"
      ],
      "hash": "e169ea4c146b4e5d51c0428133257e11",
      "id": 10
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/validateDOMNesting.js",
        "../../node_modules/react-dom/lib/traverseAllChildren.js",
        "../../node_modules/react/lib/ReactComponentTreeHook.js"
      ],
      "hash": "0633f8f465e2cabc39b58f450bcf9166",
      "id": 11
    },
    {
      "modules": [
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/react/lib/ReactElementSymbol.js",
        "../../node_modules/react/lib/React.js",
        "../../node_modules/prop-types/factory.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/ReactPropTypes.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/react/lib/ReactVersion.js",
        "../../node_modules/create-react-class/factory.js"
      ],
      "hash": "940defd566cc7edba26733baad708c03",
      "id": 12
    },
    {
      "modules": [
        "../../node_modules/react/lib/ReactBaseClasses.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/prop-types/factoryWithTypeCheckers.js"
      ],
      "hash": "1d08b68310160ad06455ec7c1bb91fbe",
      "id": 14
    }
  ]
}
```
