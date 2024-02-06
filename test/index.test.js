const tap = require('tap')
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

tap.test('schema validation', async t => {
  t.test('with an invalid Query', async t => {
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
      method: 'POST',
      url: '/graphql',
      // subtract isn't a Query on schema1, therefore this throws a validation error
      payload: '{ subtract(x: 1, y: 2) }',
      headers: {
        schema: 'schema1',
        'Content-Type': 'text/plain'
      }
    })

    const expectedResult = {
      statusCode: 400,
      code: 'MER_ERR_GQL_VALIDATION',
      error: 'Bad Request',
      message: 'Graphql validation error'
    }

    t.equal(res.statusCode, 400)
    t.strictSame(JSON.parse(res.body), expectedResult)
  })

  t.test('with a malformed Query', async t => {
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
      method: 'POST',
      url: '/graphql',
      payload: '{ add(x: 1, y: 2 }',
      headers: {
        schema: 'schema1',
        'Content-Type': 'text/plain'
      }
    })

    const expectedResult = {
      statusCode: 400,
      code: 'MER_ERR_GQL_VALIDATION',
      error: 'Bad Request',
      message: 'Graphql validation error'
    }

    t.equal(res.statusCode, 400)
    t.strictSame(JSON.parse(res.body), expectedResult)
  })
})

tap.test('schema selection', async t => {
  t.test('it can select the schema by header variable', async t => {
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
      method: 'POST',
      url: '/graphql',
      payload: '{ add(x: 1, y: 2) }',
      headers: {
        schema: 'schema1',
        'Content-Type': 'text/plain'
      }
    })

    t.equal(response.statusCode, 200)
    t.equal(
      response.payload,
      JSON.stringify({
        data: {
          add: 3
        }
      })
    )

    const response1 = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: '{ subtract(x: 1, y: 2) }',
      headers: {
        schema: 'schema2',
        'Content-Type': 'text/plain'
      }
    })
    t.equal(response1.statusCode, 200)
    t.equal(
      response1.payload,
      JSON.stringify({
        data: {
          subtract: -1
        }
      })
    )
  })

  t.test(
    "it fails if the selected schema doesn't match the request",
    async t => {
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
        method: 'POST',
        url: '/graphql',
        payload: '{ add(x: 1, y: 2) }',
        headers: {
          schema: 'schema2',
          'Content-Type': 'text/plain'
        }
      })
      t.equal(response.statusCode, 400)
    }
  )
})

tap.test('path definitions', async t => {
  t.test('it falls back to /graphql when no path is defined', async t => {
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
      method: 'POST',
      payload: '{ add(x: 1, y: 2) }',
      url: '/graphql'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.payload, JSON.stringify({ data: { add: 3 } }))
  })
  t.test('it uses custom path when defined', async t => {
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
      method: 'POST',
      payload: '{ add(x: 1, y: 2) }',
      url: '/custom-path'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.payload, JSON.stringify({ data: { add: 3 } }))
  })
})

tap.test('context sharing between mercurius instances', async t => {
  t.test('it uses the context inside the resolver', async t => {
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
      method: 'POST',
      url: '/graphql',
      payload: '{ subtract(x: 1, y: 2) }',
      headers: {
        schema: 'schema2',
        'Content-Type': 'text/plain',
        'additional-add': '3'
      }
    })
    t.equal(response.statusCode, 200)
    t.equal(
      response.payload,
      JSON.stringify({
        data: {
          subtract: 2
        }
      })
    )
  })
})
