import toml from "./data.toml";
import yaml from "./data.yaml";
import json from "./data.json5";

document.querySelector('#app').innerHTML = [toml, yaml, json].map(data => `
  <h1>${data.title}</h1>
  <div>${data.owner.name}</div>
  <div>${data.owner.organization}</div>
  <div>${data.owner.bio}</div>
  <div>${data.owner.dob}</div>
`).join('<br><br>');
