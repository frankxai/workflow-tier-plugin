import test from 'node:test'
import assert from 'node:assert/strict'
import { validateValue } from './workflow-test.mjs'

test('validateValue - string', () => {
  const schema = { type: 'string' }
  assert.deepEqual(validateValue('hello', schema), [])
  assert.deepEqual(validateValue(123, schema).length, 1)
})

test('validateValue - enum', () => {
  const schema = { enum: ['a', 'b'] }
  assert.deepEqual(validateValue('a', schema), [])
  assert.deepEqual(validateValue('c', schema).length, 1)
})

test('validateValue - integer', () => {
  const schema = { type: 'integer' }
  assert.deepEqual(validateValue(123, schema), [])
  assert.deepEqual(validateValue(123.45, schema).length, 1)
  assert.deepEqual(validateValue('123', schema).length, 1)
})

test('validateValue - number', () => {
  const schema = { type: 'number' }
  assert.deepEqual(validateValue(123.45, schema), [])
  assert.deepEqual(validateValue(123, schema), [])
  assert.deepEqual(validateValue('123', schema).length, 1)
})

test('validateValue - boolean', () => {
  const schema = { type: 'boolean' }
  assert.deepEqual(validateValue(true, schema), [])
  assert.deepEqual(validateValue(false, schema), [])
  assert.deepEqual(validateValue(1, schema).length, 1)
})

test('validateValue - array', () => {
  const schema = { type: 'array', items: { type: 'string' } }
  assert.deepEqual(validateValue(['a', 'b'], schema), [])
  assert.deepEqual(validateValue(['a', 1], schema).length, 1)
  assert.deepEqual(validateValue('not array', schema).length, 1)
})

test('validateValue - object', () => {
  const schema = {
    type: 'object',
    required: ['req'],
    properties: {
      req: { type: 'string' },
      opt: { type: 'number' }
    }
  }
  assert.deepEqual(validateValue({ req: 'hello' }, schema), [])
  assert.deepEqual(validateValue({ req: 'hello', opt: 123 }, schema), [])
  assert.deepEqual(validateValue({ opt: 123 }, schema).length, 1) // missing required
  assert.deepEqual(validateValue({ req: 123 }, schema).length, 1) // wrong type
  assert.deepEqual(validateValue(null, schema).length, 1) // not object
})

test('validateValue - array of objects', () => {
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      }
    }
  }
  assert.deepEqual(validateValue([{ id: 1 }], schema), [])
  assert.deepEqual(validateValue([{ id: '1' }], schema).length, 1)
})
