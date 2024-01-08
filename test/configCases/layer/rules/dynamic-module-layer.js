async function main(name) {
  const { object: dynamicModuleObject } = await import(`./dynamic/${name}`);
  return dynamicModuleObject;
}

export const object = {
  name: 'module entry',
  layer: __webpack_layer__,
  modules: [
    main('module1'),
    main('module2'),
  ]
};