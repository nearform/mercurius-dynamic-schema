import Fastify from 'fastify'
import mercuriusDynamicSchema from '../index.js'

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
      schema: schema,
      resolvers: resolvers,
      path: '/'
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
  },
  context: req => {
    return { add: req.headers.add }
  }
})

app.listen({ port: 3000 })
