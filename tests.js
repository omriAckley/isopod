'use strict';

const isopod = require('.');
const expect = require('chai').expect;

describe('cloning across transport', function () {

  function simulateTransport (thing) {
    return JSON.parse(JSON.stringify(thing));
  }

  function simulateTransportCloning (thing) {
    const serialized = isopod.serialize(thing);
    const transported = simulateTransport(serialized);
    return isopod.deserialize(transported);
  }

  it('works for numbers', function () {
    const original = 5;
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.equal(original);
  });

  it('works for booleans', function () {
    const original = true;
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.equal(original);
  });

  it('works for strings', function () {
    const original = 'some words and stuff';
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.equal(original);
  });

  it('works for plain objects', function () {
    const original = {a: 'do', b: 're', c: 'me', d: 1, e: 2, f: 3};
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.deep.equal(original);
  });

  it('works for plain arrays', function () {
    const original = ['do', 're', 'me', 1, 2, 3];
    const remoteClone = simulateTransportCloning(original);
    expect(remoteClone).to.deep.equal(original);
  });

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