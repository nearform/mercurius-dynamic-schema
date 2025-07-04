const { describe, test } = require('node:test')
const Fastify = require('fastify')
const mercuriusDynamicSchema = require('../index')

const schema = `
    type Query {
      add(x: Int, y: Int): Int
    }
  `

const resolvers = {
  Query: {
    add: async (_, obj) => {
      const { x, y } = obj
      return x + y
    }
  }
}

const schema2 = `
    type Query {
      subtract(x: Int, y: Int): Int
    }
  `

const resolvers2 = {
  Query: {
    subtract: async (_, obj) => {
      const { x, y } = obj
      return x - y
    }
  }
}

describe('schema validation', () => {
  test('with an invalid Query', async t => {
    const app = Fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers
        },
        {
          name: 'schema2',
          schema: schema2,
          resolvers: resolvers2
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      }
    })

    const res = await app.inject({
      method: 'GET',
      url: '/graphql',
      // subtract isn't a Query on schema1, therefore this throws a validation error
      query: {
        query: '{ subtract(x: 1, y: 2) }'
      },
      headers: {
        schema: 'schema1',
        'Content-Type': 'text/plain'
      }
    })

    const expectedResult = {
      data: null,
      errors: [
        {
          message: 'Cannot query field "subtract" on type "Query".',
          locations: [
            {
              line: 1,
              column: 3
            }
          ]
        }
      ]
    }

    t.assert.strictEqual(res.statusCode, 400)
    t.assert.deepStrictEqual(JSON.parse(res.body), expectedResult)
  })
  test('with a malformed Query', async t => {
    const app = Fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers
        },
        {
          name: 'schema2',
          schema: schema2,
          resolvers: resolvers2
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      }
    })

    const res = await app.inject({
      method: 'GET',
      url: '/graphql',
      query: {
        query: '{ add(x: 1, y: 2 }'
      },
      headers: {
        schema: 'schema1',
        'Content-Type': 'text/plain'
      }
    })

    const expectedResult = {
      data: null,
      errors: [
        {
          message: 'Syntax Error: Expected Name, found "}".',
          locations: [{ line: 1, column: 18 }]
        }
      ]
    }

    t.assert.strictEqual(res.statusCode, 400)
    t.assert.deepStrictEqual(JSON.parse(res.body), expectedResult)
  })
})

describe('schema selection', () => {
  test('it can select the schema by header variable', async t => {
    const app = Fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers
        },
        {
          name: 'schema2',
          schema: schema2,
          resolvers: resolvers2
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/graphql?query={add(x: 1, y: 2)}',
      headers: {
        schema: 'schema1',
        'Content-Type': 'text/plain'
      }
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(
      response.payload,
      JSON.stringify({
        data: {
          add: 3
        }
      })
    )

    const response1 = await app.inject({
      method: 'GET',
      url: '/graphql?query={subtract(x: 1, y: 2)}',
      headers: {
        schema: 'schema2',
        'Content-Type': 'text/plain'
      }
    })
    t.assert.strictEqual(response1.statusCode, 200)
    t.assert.strictEqual(
      response1.payload,
      JSON.stringify({
        data: {
          subtract: -1
        }
      })
    )
  })

  test("it fails if the selected schema doesn't match the request", async t => {
    const app = Fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers
        },
        {
          name: 'schema2',
          schema: schema2,
          resolvers: resolvers2
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/graphql?query={add(x: 1, y: 2)}',
      headers: {
        schema: 'schema2',
        'Content-Type': 'text/plain'
      }
    })
    t.assert.strictEqual(response.statusCode, 400)
  })
})

describe('path definitions', () => {
  test('it falls back to /graphql when no path is defined', async t => {
    const app = Fastify()

    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      },
      context: req => ({
        additionalAdd: Number(req.headers['additional-add'])
      })
    })

    const response = await app.inject({
      headers: {
        'Content-Type': 'text/plain',
        schema: 'schema1'
      },
      method: 'GET',
      query: {
        query: '{ add(x: 1, y: 2) }'
      },
      url: '/graphql'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.payload, JSON.stringify({ data: { add: 3 } }))
  })
  test('it uses custom path when defined', async t => {
    const app = Fastify()

    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers,
          path: '/custom-path'
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      },
      context: req => ({
        additionalAdd: Number(req.headers['additional-add'])
      })
    })

    const response = await app.inject({
      headers: {
        'Content-Type': 'text/plain',
        schema: 'schema1'
      },
      method: 'GET',
      query: {
        query: '{ add(x: 1, y: 2) }'
      },
      url: '/custom-path'
    })

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(response.payload, JSON.stringify({ data: { add: 3 } }))
  })
})

describe('context sharing between mercurius instances', () => {
  test('it uses the context inside the resolver', async t => {
    const app = Fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema,
          resolvers
        },
        {
          name: 'schema2',
          schema: schema2,
          resolvers: {
            Query: {
              subtract: async (_, obj, ctx) => {
                const { x, y } = obj
                return x - y + ctx.additionalAdd
              }
            }
          }
        }
      ],
      strategy: req => {
        return req.headers?.schema || 'schema1'
      },
      context: req => ({
        additionalAdd: Number(req.headers['additional-add'])
      })
    })

    const response = await app.inject({
      method: 'GET',
      url: '/graphql',
      query: {
        query: '{ subtract(x: 1, y: 2) }'
      },
      headers: {
        schema: 'schema2',
        'Content-Type': 'text/plain',
        'additional-add': '3'
      }
    })
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.strictEqual(
      response.payload,
      JSON.stringify({
        data: {
          subtract: 2
        }
      })
    )
  })
})
