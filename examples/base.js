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

app.register(mercuriusDynamicSchema, {
  schemas: [
    {
      name: 'schema1',
      schema,
      resolvers,
      path: '/custom-path'
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

app.listen({ port: 3000 })
