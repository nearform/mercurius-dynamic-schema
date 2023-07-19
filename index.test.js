import tap from 'tap'
import fastify from 'fastify'
import mercuriusDynamicSchema from './index.js'

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

tap.test('schema selection', async t => {
  t.test('it can select the schema by header variable', async t => {
    const app = fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema: schema,
          resolvers: resolvers,
          path: '/graphql'
        },
        {
          name: 'schema2',
          schema: schema2,
          resolvers: resolvers2,
          path: '/graphql'
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
    `it fails if the selected schema doesn't match the request`,
    async t => {
      const app = fastify()
      app.register(mercuriusDynamicSchema, {
        schemas: [
          {
            name: 'schema1',
            schema: schema,
            resolvers: resolvers,
            path: '/graphql'
          },
          {
            name: 'schema2',
            schema: schema2,
            resolvers: resolvers2,
            path: '/graphql'
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

tap.test('context sharing between mercurius instancies', async t => {
  t.test(`it uses the context inside the resolver`, async t => {
    const app = fastify()
    app.register(mercuriusDynamicSchema, {
      schemas: [
        {
          name: 'schema1',
          schema: schema,
          resolvers: resolvers,
          path: '/graphql'
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
          },
          path: '/graphql'
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
