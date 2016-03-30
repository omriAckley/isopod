'use strict';

const farse = require('farse');

const utils = require('./utils');

// convert a dehydrated object back into something of the correct type
function typedFromDehydrated (dehydrated) {
  switch (dehydrated.type) {
    case 'Symbol': return Symbol(dehydrated.source);
    case 'Function': return farse.inverse.inexact(dehydrated.source);
    case 'Set': return new Set();
    case 'Map': return new Map();
    case 'Array': return [];
    case 'RegExp': return new RegExp(dehydrated.source[0], dehydrated.source[1]);
    case 'Error': {
      const err = Error(dehydrated.source.message);
      if (dehydrated.source.stack) {
        Object.defineProperty(err, 'stack', {
          value: dehydrated.source.stack,
          enumerable: false
        });
      }
      return err;
    }
    case 'Object': return {};
    case 'null': return null;
    case 'undefined': return undefined;
    case 'NaN': return NaN;
    case 'Infinity': return Infinity;
    case '-Infinity': return -Infinity;
    case 'ArrayBuffer': return new Uint8Array(dehydrated.source).buffer;
    case 'Date': return new Date(dehydrated.source);
    case 'HostGlobal': return utils.hostObjFromPath(dehydrated.source);
  }
}

// use the dehydrated format to populate an empty object of the correct type
function hydrateOne (hydrated, dehydrated, refs) {
  // special values and host globals need no further hydration
  if (utils.specialTypes.has(hydrated) || utils.hostGlobals.has(hydrated)) return;
  // account for any objects that are duplicate references
  function possibleRef (v) {
    return Array.isArray(v) ? refs[v[0]] : v;
  }
  switch (dehydrated.type) {
    case 'Set': {
      // a set incorporates its source array as elements
      dehydrated.source.forEach(function (elem) {
        hydrated.add(possibleRef(elem));
      });
      break;
    }
    case 'Map': {
      // a map incorporates its source array as key-value entries
      dehydrated.source.forEach(function (mapEntry) {
        const k = mapEntry[0]; // TODO: could replace with destructuring
        const v = mapEntry[1]; // TODO: could replace with destructuring
        hydrated.set(possibleRef(k), possibleRef(v));
      });
      break;
    }
    case 'Array': {
      // an array incorporates its source array as elements
      dehydrated.source.forEach(function (elem) {
        hydrated.push(possibleRef(elem));
      });
      break;
    }
  }
  // incorporate any additional keys from the dehydrated object
  utils.each(dehydrated.keys, function (k, v) {
    if (k === 'constructor') {
      Object.defineProperty(hydrated, 'constructor', {
        value: possibleRef(v),
        enumerable: false
      });
    } else {
      hydrated[k] = possibleRef(v);
    }
  });
}

// convert a serialized thing into a fully imbued clone of the original, i.e. the one that got serialized in the first place
function deserialize (serialized) {
  // if the base serialized root is not an array it is simply a primitive value
  if (!Array.isArray(serialized)) return serialized;
  // the mapping corresponds the being-hydrated and dehydrated versions of the data
  const mapping = new Map();
  // stores bufferables to get to after the first pass
  const todoBufferables = new Map();
  // hold references to the being-hydrated objects
  const refs = serialized.map(function (dehydrated, index) {
    if (utils.bufferableTypes.has(dehydrated.type)) {
      // will need the dehydrated version and index in refs array for later use
      todoBufferables.set(dehydrated, index);
    } else {
      const emptyHydrated = typedFromDehydrated(dehydrated);
      mapping.set(dehydrated, emptyHydrated);
      return emptyHydrated;
    }
  });
  // bufferables cannot be constructed as empty and filled in later, they need their underlying buffer at construction time, which we only have access to after the first pass
  todoBufferables.forEach(function (index, dehydrated) {
    const constructor = utils.bufferableTypes.get(dehydrated.type);
    const buffer = refs[dehydrated.source.buffer[0]];
    const byteOffset = dehydrated.source.byteOffset;
    const length = dehydrated.source.length;
    const bufferable = new constructor(buffer, byteOffset, length);
    // attach properly typed reference at that index
    refs[index] = bufferable;
    // include properly typed reference to be further enriched in the final hydration step
    mapping.set(dehydrated, bufferable);
  });
  // final pass, imbue each empty (but properly typed) object with all its glorious details
  mapping.forEach(function (emptyHydrated, dehydrated) {
    hydrateOne(emptyHydrated, dehydrated, refs);
  });
  // the first ref is now a clone of the base object that was originally serialized
  return refs[0];
};

module.exports = deserialize;