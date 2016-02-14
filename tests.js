'use strict';

const isopod = require('.');
const chai = require('chai');

describe('cloning across transport', function () {

  function simulateTransport (thing) {
    return JSON.parse(JSON.sringify(thing));
  }

  function simulateTransportCloning (thing) {
    const serialized = isopod.serialize(thing);
    const transported = simulateTransport(serialized);
    return isopod.deseralize(transported);
  }

  it('works for numbers');
  it('works for booleans');
  it('works for strings');
  it('works for plain object');
  it('works for plain arrays');
  it('works for plain functions');
  it('works for plain regular expressions');
  it('works for plain symbols');
  it('works for plain sets');
  it('works for plain maps');

  it('works for circular objects');
  it('works for objects containing multiple identical symbols');
  it('works for objects containing multiple identical references');

  it('works for arrays with extra keys');
  it('works for function with extra keys');
  it('works for regular expressions with extra keys');
  it('works for sets with extra keys');
  it('works for maps with extra keys');

  it('works for objects with non-standard prototypes');
  it('works for arrays with non-standard prototypes');
  it('works for functions with non-standard prototypes');
  it('works for regular expressions with non-standard prototypes');
  it('works for sets with non-standard prototypes');
  it('works for maps with non-standard prototypes');

  it('includes non-standard constructors');

});