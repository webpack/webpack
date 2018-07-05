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
	// mode: "development || "production",
	cache: true, // better performance for the AggressiveSplittingPlugin
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
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
	recordsOutputPath: path.join(__dirname, "dist", "records.json")
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
                  Asset      Size  Chunks             Chunk Names
0970c34320caae80c02a.js  54.5 KiB       7  [emitted]  
83b274deceed463f2e6b.js  34.8 KiB       0  [emitted]  
0e1d917bc78b9875c633.js  52.1 KiB       2  [emitted]  
fa360eb6e2345a3f1eb1.js  31.1 KiB       3  [emitted]  
e73fa83e75ca1cd02064.js    43 KiB       4  [emitted]  
e1fabf154d567040fc9e.js  43.7 KiB       5  [emitted]  
c7a944568ed9e97283c6.js    46 KiB       6  [emitted]  
2ce24bf0a195b5226f1c.js  12.6 KiB       1  [emitted]  
21648f333424392ec94c.js  36.8 KiB       8  [emitted]  
fe79c8024bca5a2710e2.js    43 KiB       9  [emitted]  
11717dc27d3f6a5dbab8.js  37.6 KiB      10  [emitted]  
0c4ce63f0aa44b1872d5.js  41.7 KiB      11  [emitted]  
2db10d04d445e62740cf.js  44.7 KiB      12  [emitted]  
e5fe5d02d5fea683fb6b.js  51.9 KiB      13  [emitted]  
d2aecc6eb6d7ce0cc8bb.js  51.3 KiB      14  [emitted]  
Entrypoint main = fa360eb6e2345a3f1eb1.js e1fabf154d567040fc9e.js 83b274deceed463f2e6b.js
chunk    {0} 83b274deceed463f2e6b.js 28.3 KiB ={3}= ={5}= >{1}< >{10}< >{11}< >{12}< >{13}< >{14}< >{2}< >{4}< >{6}< >{7}< >{8}< >{9}< [entry] [rendered]
    > ./example main
    [0] ./example.js 44 bytes {0} [built]
     + 13 hidden modules
chunk    {1} 2ce24bf0a195b5226f1c.js 24.9 KiB <{0}> <{3}> <{5}> ={10}= ={11}= ={12}= ={13}= ={14}= ={2}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered]
    > react-dom [0] ./example.js 2:0-22
    3 modules
chunk    {2} 0e1d917bc78b9875c633.js 45.7 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={14}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    23 modules
chunk    {3} fa360eb6e2345a3f1eb1.js 37.8 KiB ={0}= ={5}= >{1}< >{10}< >{11}< >{12}< >{13}< >{14}< >{2}< >{4}< >{6}< >{7}< >{8}< >{9}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    8 modules
chunk    {4} e73fa83e75ca1cd02064.js 46.9 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={14}= ={2}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    8 modules
chunk    {5} e1fabf154d567040fc9e.js 45.7 KiB ={0}= ={3}= >{1}< >{10}< >{11}< >{12}< >{13}< >{14}< >{2}< >{4}< >{6}< >{7}< >{8}< >{9}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    9 modules
chunk    {6} c7a944568ed9e97283c6.js 46.3 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={14}= ={2}= ={4}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    10 modules
chunk    {7} 0970c34320caae80c02a.js 62.3 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={14}= ={2}= ={4}= ={6}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    7 modules
chunk    {8} 21648f333424392ec94c.js 43.3 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={14}= ={2}= ={4}= ={6}= ={7}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    3 modules
chunk    {9} fe79c8024bca5a2710e2.js 44.4 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={14}= ={2}= ={4}= ={6}= ={7}= ={8}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    10 modules
chunk   {10} 11717dc27d3f6a5dbab8.js 34 KiB <{0}> <{3}> <{5}> ={1}= ={11}= ={12}= ={13}= ={14}= ={2}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    16 modules
chunk   {11} 0c4ce63f0aa44b1872d5.js 48.4 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={12}= ={13}= ={14}= ={2}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    6 modules
chunk   {12} 2db10d04d445e62740cf.js 46.2 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={13}= ={14}= ={2}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    9 modules
chunk   {13} e5fe5d02d5fea683fb6b.js 48.2 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={14}= ={2}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    20 modules
chunk   {14} d2aecc6eb6d7ce0cc8bb.js 46.6 KiB <{0}> <{3}> <{5}> ={1}= ={10}= ={11}= ={12}= ={13}= ={2}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [0] ./example.js 2:0-22
    24 modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
                  Asset      Size  Chunks             Chunk Names
4941166276f1108dbd9a.js  14.8 KiB       7  [emitted]  
fcc3ab7899c5f4f4a804.js  10.2 KiB       0  [emitted]  
29f8597a02f052a18ff4.js  13.1 KiB       2  [emitted]  
5c24f2f2799de4050656.js  7.86 KiB       3  [emitted]  
99b999e1764afa73d5cf.js  8.13 KiB       4  [emitted]  
ad7f5d164d185093947d.js  10.1 KiB       5  [emitted]  
2e70eaafec9b135ac7a2.js  10.5 KiB       6  [emitted]  
f735e07d950832fae165.js  9.96 KiB       1  [emitted]  
f774c165bbfd93ad8d92.js  10.9 KiB       8  [emitted]  
fed5b1e6468f9d0ac10b.js  9.91 KiB       9  [emitted]  
0b2acbe2f173b651f308.js    12 KiB      10  [emitted]  
c05b19fbca5fc0562039.js  4.21 KiB      11  [emitted]  
ccc891a4461c9dfe6e6c.js  11.1 KiB      12  [emitted]  
621a4a2f6b4d2e9c8ed7.js  6.46 KiB      13  [emitted]  
3086a73381be557fce8b.js  5.96 KiB      14  [emitted]  
Entrypoint main = 621a4a2f6b4d2e9c8ed7.js ccc891a4461c9dfe6e6c.js 3086a73381be557fce8b.js
chunk    {0} fcc3ab7899c5f4f4a804.js 46.6 KiB <{12}> <{13}> <{14}> ={1}= ={10}= ={11}= ={2}= ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    24 modules
chunk    {1} f735e07d950832fae165.js 48.2 KiB <{12}> <{13}> <{14}> ={0}= ={10}= ={11}= ={2}= ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    20 modules
chunk    {2} 29f8597a02f052a18ff4.js 46.2 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    9 modules
chunk    {3} 5c24f2f2799de4050656.js 48.4 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    6 modules
chunk    {4} 99b999e1764afa73d5cf.js 34 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={3}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    16 modules
chunk    {5} ad7f5d164d185093947d.js 44.4 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={3}= ={4}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    10 modules
chunk    {6} 2e70eaafec9b135ac7a2.js 43.3 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={3}= ={4}= ={5}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    3 modules
chunk    {7} 4941166276f1108dbd9a.js 62.3 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={3}= ={4}= ={5}= ={6}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    7 modules
chunk    {8} f774c165bbfd93ad8d92.js 46.3 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={3}= ={4}= ={5}= ={6}= ={7}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    10 modules
chunk    {9} fed5b1e6468f9d0ac10b.js 46.9 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={11}= ={2}= ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    8 modules
chunk   {10} 0b2acbe2f173b651f308.js 45.7 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={11}= ={2}= ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered] [recorded] aggressive splitted
    > react-dom [30] ./example.js 2:0-22
    23 modules
chunk   {11} c05b19fbca5fc0562039.js 24.9 KiB <{12}> <{13}> <{14}> ={0}= ={1}= ={10}= ={2}= ={3}= ={4}= ={5}= ={6}= ={7}= ={8}= ={9}= [rendered]
    > react-dom [30] ./example.js 2:0-22
    3 modules
chunk   {12} ccc891a4461c9dfe6e6c.js 45.7 KiB ={13}= ={14}= >{0}< >{1}< >{10}< >{11}< >{2}< >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    9 modules
chunk   {13} 621a4a2f6b4d2e9c8ed7.js 37.8 KiB ={12}= ={14}= >{0}< >{1}< >{10}< >{11}< >{2}< >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< [initial] [rendered] [recorded] aggressive splitted
    > ./example main
    8 modules
chunk   {14} 3086a73381be557fce8b.js 28.3 KiB ={12}= ={13}= >{0}< >{1}< >{10}< >{11}< >{2}< >{3}< >{4}< >{5}< >{6}< >{7}< >{8}< >{9}< [entry] [rendered]
    > ./example main
   [30] ./example.js 44 bytes {14} [built]
     + 13 hidden modules
```

## Records

```
{
  "modules": {
    "byIdentifier": {
      "example.js": 0,
      "../../node_modules/react/react.js": 1,
      "../../node_modules/react/lib/React.js": 2,
      "../../node_modules/object-assign/index.js": 3,
      "../../node_modules/react/lib/ReactBaseClasses.js": 4,
      "../../node_modules/react/lib/reactProdInvariant.js": 5,
      "../../node_modules/react/lib/ReactNoopUpdateQueue.js": 6,
      "../../node_modules/fbjs/lib/warning.js": 7,
      "../../node_modules/fbjs/lib/emptyFunction.js": 8,
      "../../node_modules/react/lib/canDefineProperty.js": 9,
      "../../node_modules/fbjs/lib/emptyObject.js": 10,
      "../../node_modules/fbjs/lib/invariant.js": 11,
      "../../node_modules/react/lib/lowPriorityWarning.js": 12,
      "../../node_modules/react/lib/ReactChildren.js": 13,
      "../../node_modules/react/lib/PooledClass.js": 14,
      "../../node_modules/react/lib/ReactElement.js": 15,
      "../../node_modules/react/lib/ReactCurrentOwner.js": 16,
      "../../node_modules/react/lib/ReactElementSymbol.js": 17,
      "../../node_modules/react/lib/traverseAllChildren.js": 18,
      "../../node_modules/react/lib/getIteratorFn.js": 19,
      "../../node_modules/react/lib/KeyEscapeUtils.js": 20,
      "../../node_modules/react/lib/ReactDOMFactories.js": 21,
      "../../node_modules/react/lib/ReactPropTypes.js": 22,
      "../../node_modules/prop-types/factory.js": 23,
      "../../node_modules/prop-types/factoryWithTypeCheckers.js": 24,
      "../../node_modules/prop-types/lib/ReactPropTypesSecret.js": 25,
      "../../node_modules/prop-types/checkPropTypes.js": 26,
      "../../node_modules/react/lib/ReactVersion.js": 27,
      "../../node_modules/react/lib/createClass.js": 28,
      "../../node_modules/create-react-class/factory.js": 29,
      "../../node_modules/react/lib/onlyChild.js": 30,
      "../../node_modules/react-dom/index.js": 31,
      "../../node_modules/react-dom/lib/ReactDOM.js": 32,
      "../../node_modules/react-dom/lib/ReactDOMComponentTree.js": 33,
      "../../node_modules/react-dom/lib/reactProdInvariant.js": 34,
      "../../node_modules/react-dom/lib/DOMProperty.js": 35,
      "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js": 36,
      "../../node_modules/react-dom/lib/ReactDefaultInjection.js": 37,
      "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js": 38,
      "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js": 39,
      "../../node_modules/react-dom/lib/EventPropagators.js": 40,
      "../../node_modules/react-dom/lib/EventPluginHub.js": 41,
      "../../node_modules/react-dom/lib/EventPluginRegistry.js": 42,
      "../../node_modules/react-dom/lib/EventPluginUtils.js": 43,
      "../../node_modules/react-dom/lib/ReactErrorUtils.js": 44,
      "../../node_modules/react-dom/lib/accumulateInto.js": 45,
      "../../node_modules/react-dom/lib/forEachAccumulated.js": 46,
      "../../node_modules/fbjs/lib/ExecutionEnvironment.js": 47,
      "../../node_modules/react-dom/lib/FallbackCompositionState.js": 48,
      "../../node_modules/react-dom/lib/PooledClass.js": 49,
      "../../node_modules/react-dom/lib/getTextContentAccessor.js": 50,
      "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js": 51,
      "../../node_modules/react-dom/lib/SyntheticEvent.js": 52,
      "../../node_modules/react-dom/lib/SyntheticInputEvent.js": 53,
      "../../node_modules/react-dom/lib/ChangeEventPlugin.js": 54,
      "../../node_modules/react-dom/lib/ReactUpdates.js": 55,
      "../../node_modules/react-dom/lib/CallbackQueue.js": 56,
      "../../node_modules/react-dom/lib/ReactFeatureFlags.js": 57,
      "../../node_modules/react-dom/lib/ReactReconciler.js": 58,
      "../../node_modules/react-dom/lib/ReactRef.js": 59,
      "../../node_modules/react-dom/lib/ReactOwner.js": 60,
      "../../node_modules/react-dom/lib/ReactInstrumentation.js": 61,
      "../../node_modules/react-dom/lib/Transaction.js": 62,
      "../../node_modules/react-dom/lib/inputValueTracking.js": 63,
      "../../node_modules/react-dom/lib/getEventTarget.js": 64,
      "../../node_modules/react-dom/lib/isEventSupported.js": 65,
      "../../node_modules/react-dom/lib/isTextInputElement.js": 66,
      "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js": 67,
      "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js": 68,
      "../../node_modules/react-dom/lib/SyntheticMouseEvent.js": 69,
      "../../node_modules/react-dom/lib/SyntheticUIEvent.js": 70,
      "../../node_modules/react-dom/lib/ViewportMetrics.js": 71,
      "../../node_modules/react-dom/lib/getEventModifierState.js": 72,
      "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js": 73,
      "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js": 74,
      "../../node_modules/react-dom/lib/DOMChildrenOperations.js": 75,
      "../../node_modules/react-dom/lib/DOMLazyTree.js": 76,
      "../../node_modules/react-dom/lib/DOMNamespaces.js": 77,
      "../../node_modules/react-dom/lib/setInnerHTML.js": 78,
      "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js": 79,
      "../../node_modules/react-dom/lib/setTextContent.js": 80,
      "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js": 81,
      "../../node_modules/react-dom/lib/Danger.js": 82,
      "../../node_modules/fbjs/lib/createNodesFromMarkup.js": 83,
      "../../node_modules/fbjs/lib/createArrayFromMixed.js": 84,
      "../../node_modules/fbjs/lib/getMarkupWrap.js": 85,
      "../../node_modules/react-dom/lib/ReactDOMIDOperations.js": 86,
      "../../node_modules/react-dom/lib/ReactDOMComponent.js": 87,
      "../../node_modules/react-dom/lib/AutoFocusUtils.js": 88,
      "../../node_modules/fbjs/lib/focusNode.js": 89,
      "../../node_modules/react-dom/lib/CSSPropertyOperations.js": 90,
      "../../node_modules/react-dom/lib/CSSProperty.js": 91,
      "../../node_modules/fbjs/lib/camelizeStyleName.js": 92,
      "../../node_modules/fbjs/lib/camelize.js": 93,
      "../../node_modules/react-dom/lib/dangerousStyleValue.js": 94,
      "../../node_modules/fbjs/lib/hyphenateStyleName.js": 95,
      "../../node_modules/fbjs/lib/hyphenate.js": 96,
      "../../node_modules/fbjs/lib/memoizeStringOnly.js": 97,
      "../../node_modules/react-dom/lib/DOMPropertyOperations.js": 98,
      "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js": 99,
      "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js": 100,
      "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js": 101,
      "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js": 102,
      "../../node_modules/react-dom/lib/ReactDOMInput.js": 103,
      "../../node_modules/react-dom/lib/LinkedValueUtils.js": 104,
      "../../node_modules/react-dom/lib/ReactPropTypesSecret.js": 105,
      "../../node_modules/react-dom/lib/ReactDOMOption.js": 106,
      "../../node_modules/react-dom/lib/ReactDOMSelect.js": 107,
      "../../node_modules/react-dom/lib/ReactDOMTextarea.js": 108,
      "../../node_modules/react-dom/lib/ReactMultiChild.js": 109,
      "../../node_modules/react-dom/lib/ReactComponentEnvironment.js": 110,
      "../../node_modules/react-dom/lib/ReactInstanceMap.js": 111,
      "../../node_modules/react-dom/lib/ReactChildReconciler.js": 112,
      "../../node_modules/process/browser.js": 113,
      "../../node_modules/react-dom/lib/instantiateReactComponent.js": 114,
      "../../node_modules/react-dom/lib/ReactCompositeComponent.js": 115,
      "../../node_modules/react-dom/lib/ReactNodeTypes.js": 116,
      "../../node_modules/fbjs/lib/shallowEqual.js": 117,
      "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js": 118,
      "../../node_modules/react-dom/lib/ReactEmptyComponent.js": 119,
      "../../node_modules/react-dom/lib/ReactHostComponent.js": 120,
      "../../node_modules/react/lib/getNextDebugID.js": 121,
      "../../node_modules/react-dom/lib/KeyEscapeUtils.js": 122,
      "../../node_modules/react-dom/lib/traverseAllChildren.js": 123,
      "../../node_modules/react-dom/lib/ReactElementSymbol.js": 124,
      "../../node_modules/react-dom/lib/getIteratorFn.js": 125,
      "../../node_modules/react/lib/ReactComponentTreeHook.js": 126,
      "../../node_modules/react-dom/lib/flattenChildren.js": 127,
      "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js": 128,
      "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js": 129,
      "../../node_modules/react-dom/lib/ReactUpdateQueue.js": 130,
      "../../node_modules/react-dom/lib/validateDOMNesting.js": 131,
      "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js": 132,
      "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js": 133,
      "../../node_modules/react-dom/lib/ReactDOMTextComponent.js": 134,
      "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js": 135,
      "../../node_modules/react-dom/lib/ReactEventListener.js": 136,
      "../../node_modules/fbjs/lib/EventListener.js": 137,
      "../../node_modules/fbjs/lib/getUnboundedScrollPosition.js": 138,
      "../../node_modules/react-dom/lib/ReactInjection.js": 139,
      "../../node_modules/react-dom/lib/ReactReconcileTransaction.js": 140,
      "../../node_modules/react-dom/lib/ReactInputSelection.js": 141,
      "../../node_modules/react-dom/lib/ReactDOMSelection.js": 142,
      "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js": 143,
      "../../node_modules/fbjs/lib/containsNode.js": 144,
      "../../node_modules/fbjs/lib/isTextNode.js": 145,
      "../../node_modules/fbjs/lib/isNode.js": 146,
      "../../node_modules/fbjs/lib/getActiveElement.js": 147,
      "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js": 148,
      "../../node_modules/react-dom/lib/SelectEventPlugin.js": 149,
      "../../node_modules/react-dom/lib/SimpleEventPlugin.js": 150,
      "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js": 151,
      "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js": 152,
      "../../node_modules/react-dom/lib/SyntheticFocusEvent.js": 153,
      "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js": 154,
      "../../node_modules/react-dom/lib/getEventCharCode.js": 155,
      "../../node_modules/react-dom/lib/getEventKey.js": 156,
      "../../node_modules/react-dom/lib/SyntheticDragEvent.js": 157,
      "../../node_modules/react-dom/lib/SyntheticTouchEvent.js": 158,
      "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js": 159,
      "../../node_modules/react-dom/lib/SyntheticWheelEvent.js": 160,
      "../../node_modules/react-dom/lib/ReactMount.js": 161,
      "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js": 162,
      "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js": 163,
      "../../node_modules/react-dom/lib/ReactMarkupChecksum.js": 164,
      "../../node_modules/react-dom/lib/adler32.js": 165,
      "../../node_modules/react-dom/lib/ReactVersion.js": 166,
      "../../node_modules/react-dom/lib/findDOMNode.js": 167,
      "../../node_modules/react-dom/lib/getHostComponentFromComposite.js": 168,
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
    "bySource": {
      "11 example.js react-dom": 1,
      "0 example.js react-dom": 2,
      "1 example.js react-dom": 4,
      "2 example.js react-dom": 6,
      "3 example.js react-dom": 7,
      "4 example.js react-dom": 8,
      "5 example.js react-dom": 9,
      "6 example.js react-dom": 10,
      "7 example.js react-dom": 11,
      "8 example.js react-dom": 12,
      "9 example.js react-dom": 13,
      "10 example.js react-dom": 14
    },
    "usedIds": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14
    ]
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
        "../../node_modules/react-dom/lib/ARIADOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/AutoFocusUtils.js",
        "../../node_modules/react-dom/lib/BeforeInputEventPlugin.js",
        "../../node_modules/react-dom/lib/CSSProperty.js"
      ],
      "size": 46843,
      "hash": "0e1d917bc78b9875c63333b0e556b853",
      "id": 2
    },
    {
      "modules": [
        "../../node_modules/create-react-class/factory.js",
        "../../node_modules/fbjs/lib/emptyFunction.js",
        "../../node_modules/fbjs/lib/emptyObject.js",
        "../../node_modules/fbjs/lib/invariant.js",
        "../../node_modules/fbjs/lib/warning.js",
        "../../node_modules/object-assign/index.js",
        "../../node_modules/prop-types/checkPropTypes.js",
        "../../node_modules/prop-types/factory.js"
      ],
      "size": 38697,
      "hash": "fa360eb6e2345a3f1eb10a9dd972c6ab",
      "id": 3
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/CSSPropertyOperations.js",
        "../../node_modules/react-dom/lib/CallbackQueue.js",
        "../../node_modules/react-dom/lib/ChangeEventPlugin.js",
        "../../node_modules/react-dom/lib/DOMChildrenOperations.js",
        "../../node_modules/react-dom/lib/DOMLazyTree.js",
        "../../node_modules/react-dom/lib/DOMNamespaces.js",
        "../../node_modules/react-dom/lib/DOMProperty.js",
        "../../node_modules/react-dom/lib/DOMPropertyOperations.js"
      ],
      "size": 47979,
      "hash": "e73fa83e75ca1cd020645a8ce43df014",
      "id": 4
    },
    {
      "modules": [
        "../../node_modules/prop-types/factoryWithTypeCheckers.js",
        "../../node_modules/prop-types/lib/ReactPropTypesSecret.js",
        "../../node_modules/react/lib/KeyEscapeUtils.js",
        "../../node_modules/react/lib/PooledClass.js",
        "../../node_modules/react/lib/React.js",
        "../../node_modules/react/lib/ReactBaseClasses.js",
        "../../node_modules/react/lib/ReactChildren.js",
        "../../node_modules/react/lib/ReactCurrentOwner.js",
        "../../node_modules/react/lib/ReactDOMFactories.js"
      ],
      "size": 46762,
      "hash": "e1fabf154d567040fc9ee7969ad63ddd",
      "id": 5
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/Danger.js",
        "../../node_modules/react-dom/lib/DefaultEventPluginOrder.js",
        "../../node_modules/react-dom/lib/EnterLeaveEventPlugin.js",
        "../../node_modules/react-dom/lib/EventPluginHub.js",
        "../../node_modules/react-dom/lib/EventPluginRegistry.js",
        "../../node_modules/react-dom/lib/EventPluginUtils.js",
        "../../node_modules/react-dom/lib/EventPropagators.js",
        "../../node_modules/react-dom/lib/FallbackCompositionState.js",
        "../../node_modules/react-dom/lib/HTMLDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/KeyEscapeUtils.js"
      ],
      "size": 47455,
      "hash": "c7a944568ed9e97283c6ae9fb8c59803",
      "id": 6
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/LinkedValueUtils.js",
        "../../node_modules/react-dom/lib/PooledClass.js",
        "../../node_modules/react-dom/lib/ReactBrowserEventEmitter.js",
        "../../node_modules/react-dom/lib/ReactChildReconciler.js",
        "../../node_modules/react-dom/lib/ReactComponentBrowserEnvironment.js",
        "../../node_modules/react-dom/lib/ReactComponentEnvironment.js",
        "../../node_modules/react-dom/lib/ReactCompositeComponent.js"
      ],
      "size": 63814,
      "hash": "0970c34320caae80c02a9ee83c0bfa96",
      "id": 7
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOM.js",
        "../../node_modules/react-dom/lib/ReactDOMComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMComponentFlags.js"
      ],
      "size": 44366,
      "hash": "21648f333424392ec94c88e713f40f89",
      "id": 8
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMComponentTree.js",
        "../../node_modules/react-dom/lib/ReactDOMContainerInfo.js",
        "../../node_modules/react-dom/lib/ReactDOMEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactDOMFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactDOMIDOperations.js",
        "../../node_modules/react-dom/lib/ReactDOMInput.js",
        "../../node_modules/react-dom/lib/ReactDOMOption.js",
        "../../node_modules/react-dom/lib/ReactDOMSelect.js",
        "../../node_modules/react-dom/lib/ReactDOMSelection.js",
        "../../node_modules/react-dom/lib/ReactDOMTextComponent.js"
      ],
      "size": 45476,
      "hash": "fe79c8024bca5a2710e28bfc9f97ce11",
      "id": 9
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactDOMTextarea.js",
        "../../node_modules/react-dom/lib/ReactDOMTreeTraversal.js",
        "../../node_modules/react-dom/lib/ReactDefaultBatchingStrategy.js",
        "../../node_modules/react-dom/lib/ReactDefaultInjection.js",
        "../../node_modules/react-dom/lib/ReactElementSymbol.js",
        "../../node_modules/react-dom/lib/ReactEmptyComponent.js",
        "../../node_modules/react-dom/lib/ReactErrorUtils.js",
        "../../node_modules/react-dom/lib/ReactEventEmitterMixin.js",
        "../../node_modules/react-dom/lib/ReactEventListener.js",
        "../../node_modules/react-dom/lib/ReactFeatureFlags.js",
        "../../node_modules/react-dom/lib/ReactHostComponent.js",
        "../../node_modules/react-dom/lib/ReactInjection.js",
        "../../node_modules/react-dom/lib/ReactInputSelection.js",
        "../../node_modules/react-dom/lib/ReactInstanceMap.js",
        "../../node_modules/react-dom/lib/ReactInstrumentation.js",
        "../../node_modules/react-dom/lib/ReactMarkupChecksum.js"
      ],
      "size": 34770,
      "hash": "11717dc27d3f6a5dbab89e8ba4330998",
      "id": 10
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactMount.js",
        "../../node_modules/react-dom/lib/ReactMultiChild.js",
        "../../node_modules/react-dom/lib/ReactNodeTypes.js",
        "../../node_modules/react-dom/lib/ReactOwner.js",
        "../../node_modules/react-dom/lib/ReactPropTypesSecret.js",
        "../../node_modules/react-dom/lib/ReactReconcileTransaction.js"
      ],
      "size": 49575,
      "hash": "0c4ce63f0aa44b1872d5195e69fd3cb5",
      "id": 11
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/ReactReconciler.js",
        "../../node_modules/react-dom/lib/ReactRef.js",
        "../../node_modules/react-dom/lib/ReactServerRenderingTransaction.js",
        "../../node_modules/react-dom/lib/ReactServerUpdateQueue.js",
        "../../node_modules/react-dom/lib/ReactUpdateQueue.js",
        "../../node_modules/react-dom/lib/ReactUpdates.js",
        "../../node_modules/react-dom/lib/ReactVersion.js",
        "../../node_modules/react-dom/lib/SVGDOMPropertyConfig.js",
        "../../node_modules/react-dom/lib/SelectEventPlugin.js"
      ],
      "size": 47320,
      "hash": "2db10d04d445e62740cf5103dd9e5633",
      "id": 12
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/SimpleEventPlugin.js",
        "../../node_modules/react-dom/lib/SyntheticAnimationEvent.js",
        "../../node_modules/react-dom/lib/SyntheticClipboardEvent.js",
        "../../node_modules/react-dom/lib/SyntheticCompositionEvent.js",
        "../../node_modules/react-dom/lib/SyntheticDragEvent.js",
        "../../node_modules/react-dom/lib/SyntheticEvent.js",
        "../../node_modules/react-dom/lib/SyntheticFocusEvent.js",
        "../../node_modules/react-dom/lib/SyntheticInputEvent.js",
        "../../node_modules/react-dom/lib/SyntheticKeyboardEvent.js",
        "../../node_modules/react-dom/lib/SyntheticMouseEvent.js",
        "../../node_modules/react-dom/lib/SyntheticTouchEvent.js",
        "../../node_modules/react-dom/lib/SyntheticTransitionEvent.js",
        "../../node_modules/react-dom/lib/SyntheticUIEvent.js",
        "../../node_modules/react-dom/lib/SyntheticWheelEvent.js",
        "../../node_modules/react-dom/lib/Transaction.js",
        "../../node_modules/react-dom/lib/ViewportMetrics.js",
        "../../node_modules/react-dom/lib/accumulateInto.js",
        "../../node_modules/react-dom/lib/adler32.js",
        "../../node_modules/react-dom/lib/createMicrosoftUnsafeLocalFunction.js",
        "../../node_modules/react-dom/lib/dangerousStyleValue.js"
      ],
      "size": 49350,
      "hash": "e5fe5d02d5fea683fb6b8ff14525787b",
      "id": 13
    },
    {
      "modules": [
        "../../node_modules/react-dom/lib/escapeTextContentForBrowser.js",
        "../../node_modules/react-dom/lib/findDOMNode.js",
        "../../node_modules/react-dom/lib/flattenChildren.js",
        "../../node_modules/react-dom/lib/forEachAccumulated.js",
        "../../node_modules/react-dom/lib/getEventCharCode.js",
        "../../node_modules/react-dom/lib/getEventKey.js",
        "../../node_modules/react-dom/lib/getEventModifierState.js",
        "../../node_modules/react-dom/lib/getEventTarget.js",
        "../../node_modules/react-dom/lib/getHostComponentFromComposite.js",
        "../../node_modules/react-dom/lib/getIteratorFn.js",
        "../../node_modules/react-dom/lib/getNodeForCharacterOffset.js",
        "../../node_modules/react-dom/lib/getTextContentAccessor.js",
        "../../node_modules/react-dom/lib/getVendorPrefixedEventName.js",
        "../../node_modules/react-dom/lib/inputValueTracking.js",
        "../../node_modules/react-dom/lib/instantiateReactComponent.js",
        "../../node_modules/react-dom/lib/isEventSupported.js",
        "../../node_modules/react-dom/lib/isTextInputElement.js",
        "../../node_modules/react-dom/lib/quoteAttributeValueForBrowser.js",
        "../../node_modules/react-dom/lib/reactProdInvariant.js",
        "../../node_modules/react-dom/lib/renderSubtreeIntoContainer.js",
        "../../node_modules/react-dom/lib/setInnerHTML.js",
        "../../node_modules/react-dom/lib/setTextContent.js",
        "../../node_modules/react-dom/lib/shouldUpdateReactComponent.js",
        "../../node_modules/react-dom/lib/traverseAllChildren.js"
      ],
      "size": 47718,
      "hash": "d2aecc6eb6d7ce0cc8bbf8615d134326",
      "id": 14
    }
  ]
}
```
