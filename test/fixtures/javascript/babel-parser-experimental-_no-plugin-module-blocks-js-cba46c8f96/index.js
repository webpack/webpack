let moduleBlock = module {
  export let y = 1;
};
let moduleExports = await import(moduleBlock);
