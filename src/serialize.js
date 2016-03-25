'use strict';

const utils = require('./utils');

function bufferableSource (bufferable) {
  // in case a bufferable has a non-standard prototype
  const currentProto = Object.getPrototypeOf(bufferable);
  const originalProto = utils.bufferableTypes.get(utils.isopodTypeOf(bufferable)).prototype;
  // temporarily change prototype back to original
  Object.setPrototypeOf(bufferable, originalProto);
  // a bufferable's source contains its buffer, the byteOffset, and the length
  const source = {
    buffer: bufferable.buffer,
    byteOffset: bufferable.byteOffset,
    length: bufferable.length
  };
  // change back to assigned prototype
  Object.setPrototypeOf(bufferable, currentProto);
  return source;
}

// given some object or primitive, convert it into a format that will retain all its details when stringified
function serialize (root) {

  // deal with trivial case
  if (utils.isSimple(root)) return root;

  // the serialized result will be an array of "dehydrated" objects
  const serialized = [];
  // the idCache keeps track of any objects (or symbols) that have been seen already
  const idCache = new Map();

  // incorporate an object (or symbol) into the cache and return the seed of a dehydrated stand-in
  function assoc (original) {
    const dehydrated = {};
    // the id represents the location of the dehydrated object in the root serialized array
    const id = serialized.push(dehydrated)-1;
    idCache.set(original, id);
    return dehydrated;
  }

  // catch-all to obtain various meaningful "source" values from native Object types
  function sourceValueFrom (original, type) {
    // objects and special values don't have a "source"
    if (type === 'Object' || utils.specialTypes.has(original)) return;
    if (utils.bufferableTypes.has(type)) {
      // make sure to attach the buffer by reference
      const source = bufferableSource(original);
      source.buffer = dehydrate(source.buffer);
      return source;
    }
    switch (type) {
      // a symbol's source is the string used to construct it
      case 'Symbol': return utils.getSymbolString(original);
      // a function's source is its source string
      case 'Function': return Function.prototype.toString.call(original);
      case 'RegExp': return [original.source, utils.flags(original)];
      case 'Error': {
        return {
          message: Object.prototype.hasOwnProperty.call(original, 'message') ? original.message : undefined,
          stack: original.stack
        };
      }
      // an array's source is an array copy of its elements
      case 'Array': return Array.prototype.map.call(original, dehydrate);
      case 'Set': {
        // a set's source is an array of the set elements
        const source = [];
        Set.prototype.forEach.call(original, function (elem) {
          source.push(dehydrate(elem));
        });
        return source;
      }
      case 'Map': {
        // a map's source is an array of key-value pair arrays
        const source = [];
        Map.prototype.forEach.call(original, function (v, k) {
          source.push([k,v].map(dehydrate));
        });
        return source;
      }
      // an array buffer's source is its Uint8Array representation
      case 'ArrayBuffer': return Array.prototype.slice.call(new Uint8Array(original));
      case 'Date': return Date.prototype.valueOf.call(original);
      case 'HostGlobal': return utils.hostGlobals.get(original);
    }
  }

  // return any keys in the original not accounted for in the source
  function cloneKeys (original, source) {
    // special values do not have keys, host globals don't need 'em
    if (utils.specialTypes.has(original) || utils.hostGlobals.has(original)) return;
    const clone = {};
    const proto = Object.getPrototypeOf(original);
    // include original's __proto__ when cloning it, if it's non-native
    if (!utils.nativePrototypes.has(proto)) {
      Object.defineProperty(clone, '__proto__', {
        value: dehydrate(proto),
        enumerable: true // ensure that it will show up as a result of stringification
      });
    }
    // include the original's constructor if it has one
    if (utils.hasNonNativeConstructor(original)) {
      const constructor = original.constructor;
      if (constructor instanceof Object && constructor.prototype === original) {
        clone.constructor = dehydrate(constructor);
      }
    }
    // include all keys in original not yet accounted for by the source
    utils.each(original, function (k, v) {
      // make sure not to double include numerical array keys already in the source
      if (source && utils.isPlainOrTypedArray(original) && !Number.isNaN(Number(k))) return;
      clone[k] = dehydrate(v);
    });
    return clone;
  }

  // convert something into a rehydratable format
  function dehydrate (thing) {
    // simple values (non-special booleans, numbers, and strings) remain themselves
    if (utils.isSimple(thing)) return thing;
    if (!idCache.has(thing)) {
      // incorporate the object into the cache
      const dehydrated = assoc(thing);
      // set its type (helps streamline deserialization)
      dehydrated.type = utils.isopodTypeOf(thing);
      // set its "source" value (helps streamline deserialization)
      dehydrated.source = sourceValueFrom(thing, dehydrated.type);
      // set any additional keys not included in the source
      dehydrated.keys = cloneKeys(thing, dehydrated.source);
    }
    // objects are replaced with the id representing their location in the root serialized array (helps streamline deserialization)
    return [idCache.get(thing)]
  }

  // kick off the recursive process of dehydrating everything in the original
  dehydrate(root);
  
  return serialized;

};

module.exports = serialize;