import Fastify from 'fastify'
import mercuriusDynamicSchema from '../index.js'

// /!\/!\/!\ Mercurius persisted queries is currently not supported

const app = Fastify({
  logger: true
})

const schema = `
    type Query {
      add(x: Int, y: Int): Int
    }
  `

const resolvers = {
  Query: {
    add: async (_, obj, ctx) => {
      const { x, y } = obj
      return x + y + Number(ctx?.add ?? 0)
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
    subtract: async (_, obj, ctx) => {
      const { x, y } = obj
      return x - y + Number(ctx?.add ?? 0)
    }
  }
}

app.register(mercuriusDynamicSchema, {
  schemas: [
    {
      name: 'schema1',
      schema,
      resolvers,
      path: '/',
      persistedQueries: {
        BF61A23D73BA6E5F2DE29CA4EEEBBA098FC577EA134CA6ACDE99E1C5D25D98CD:
          '{ add(x: 1, y: 2) }'
      }
    },
    {
      name: 'schema2',
      schema: schema2,
      resolvers: resolvers2,
      path: '/'
    }
  ],
  strategy: req => {
    return req.headers?.schema || 'schema1'
  }
})

app.listen({ port: 3000 })
