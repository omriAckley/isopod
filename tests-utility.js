'use strict';

// TODO: move this into its own standalone module (and test it)

const expect = require('chai').expect;

function isPrimitive (thing) {
  return !(thing instanceof Object) && typeof thing !== 'symbol';
}

const nativeConstructors = new Set([
  Object,
  Function,
  Set,
  Symbol,
  Array,
  Map,
  RegExp
]);
const nativePrototypes = new Set();
nativeConstructors.forEach(function (constructor) {
  nativePrototypes.add(constructor.prototype);
});

function isNative (thing) {
  return nativeConstructors.has(thing) || nativePrototypes.has(thing);
}

function objectType (obj) {
  if (typeof obj === 'symbol') return 'Symbol';
  if (typeof obj === 'function') return 'Function';
  if (obj instanceof Set) return 'Set';
  if (obj instanceof Map) return 'Map';
  if (Array.isArray(obj)) return 'Array';
  if (obj instanceof RegExp) return 'RegExp';
  return 'Object';
}

function areSamePrimitive (x, y) {
  if (Number.isNaN(x)) return Number.isNaN(y);
  else return x === y;
}

function areDeeplyEquivalentOnly (actual, expected, seen) {
  if (isPrimitive(actual) || isPrimitive(expected)) return areSamePrimitive(actual, expected);
  if (isNative(actual) || isNative(expected)) return actual === expected;
  if (actual === expected) return false;
  seen = seen || new Map();
  if (seen.has(actual)) {
    return seen.get(actual) === expected;
  } else {
    seen.set(actual, expected);
  }
  const aType = objectType(actual);
  const eType = objectType(expected);
  if (aType !== eType) return false;
  const aKeys = Object.keys(actual);
  const eKeys = Object.keys(expected);
  if (aKeys.length !== eKeys.length) return false;
  const equivalentKeyVals = aKeys.every(function (k) {
    if (!Object.prototype.propertyIsEnumerable.call(expected, k)) return false;
    return areDeeplyEquivalentOnly(actual[k], expected[k], seen);
  });
  if (!equivalentKeyVals) return false;
  const aProto = Object.getPrototypeOf(actual);
  const eProto = Object.getPrototypeOf(expected);
  if (!areDeeplyEquivalentOnly(aProto, eProto, seen)) return false;
  if (aType === 'Symbol') {
    return Symbol.prototype.toString.call(actual) === Symbol.prototype.toString.call(expected);
  } else if (aType === 'Function') {
    return Function.prototype.toString.call(actual) === Function.prototype.toString.call(expected);
  } else if (aType === 'Set') {
    if (actual.size !== expected.size) return false;
    const expectedCopy = new Set(expected);
    outer:
    for (let aElem of actual) {
      for (let eElem of expectedCopy) {
        if (areDeeplyEquivalentOnly(aElem, eElem, seen)) {
          expectedCopy.delete(eElem);
          continue outer;
        }
      }
      return false;
    }
    return true;
  } else if (aType === 'Map') {
    if (actual.size !== expected.size) return false;
    const expectedCopy = new Map(expected);
    outer:
    for (let aEntry of actual) {
      for (let eEntry of expectedCopy) {
        if (areDeeplyEquivalentOnly(aEntry, eEntry, seen)) {
          expectedCopy.delete(eEntry[0]);
          continue outer;
        }
      }
      return false;
    }
    return true;
  } else {
    return true;
  }
}

module.exports = areDeeplyEquivalentOnly;