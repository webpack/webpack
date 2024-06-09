const { urlToRequest } = require("loader-utils");
const { createResolve } = require("./util.js");

/** @type {import("../../../types.js").LoaderDefinition<{ i: string }>} */
module.exports = function loader(entryJson) {
  const callback = this.async();

  main(this, entryJson)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error);
    });
};

async function main(loader, entryJson) {
  loader.cacheable();
  const resolve = createResolve(loader);

  const entry = JSON.parse(entryJson);
  entry.asset = await resolve(urlToRequest(entry.asset));

  return JSON.stringify(entry);
}
