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
  RegExp,
  Error
]);
const nativePrototypes = new Set();
nativeConstructors.forEach(function (constructor) {
  nativePrototypes.add(constructor.prototype);
});

function isNative (thing) {
  return nativeConstructors.has(thing) || nativePrototypes.has(thing);
}

function baseTypeOf (thing) {
  return Object.prototype.toString.call(thing).slice(8,-1);
}

function areDeeplyEquivalentOnly (actual, expected, seen) {
  if (isPrimitive(actual) || isPrimitive(expected)) return Object.is(actual, expected);
  if (isNative(actual) || isNative(expected)) return actual === expected;
  if (actual === expected) return false;
  seen = seen || new Map();
  if (seen.has(actual)) {
    return seen.get(actual) === expected;
  } else {
    seen.set(actual, expected);
  }
  const aType = baseTypeOf(actual);
  const eType = baseTypeOf(expected);
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
  } else if (aType === 'Error') {
    return actual.message === expected.message;
  } else if (aType === 'Set') {
    const actualCopy = new Set();
    Set.prototype.forEach.call(actual, function (elem) {
      actualCopy.add(elem);
    });
    const expectedCopy = new Set();
    Set.prototype.forEach.call(expected, function (elem) {
      expectedCopy.add(elem);
    });
    if (actualCopy.size !== expectedCopy.size) return false;
    outer:
    for (let aElem of actualCopy) {
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
    const actualCopy = new Map();
    Map.prototype.forEach.call(actual, function (v, k) {
      actualCopy.set(k, v);
    });
    const expectedCopy = new Map();
    Map.prototype.forEach.call(expected, function (v, k) {
      expectedCopy.set(k, v);
    });
    if (actualCopy.size !== expectedCopy.size) return false;
    outer:
    for (let aEntry of actualCopy) {
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