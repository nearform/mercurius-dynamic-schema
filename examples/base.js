const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusDynamicSchema = require('..')

// Initialize fastify
const app = Fastify({
    logger: true
})

// Schema 1 definition
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
    schemas: [{
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
    }],
    strategy: (req, ctx) => {
        return req.headers?.schema || 'schema1'
    }
})

app.listen({ port: 3000 })

