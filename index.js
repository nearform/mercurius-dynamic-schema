const fp = require('fastify-plugin')
const mercurius = require('mercurius')
const { MER_ERR_GQL_VALIDATION } = require('mercurius/lib/errors')
const { createPersistedQueryExecutor } = require('mercurius/lib/persistedQuery')

const PLUGIN_NAME = 'mercuriusDynamicSchema'
const STRATEGY_NAME = 'mercuriusDynamicSchemaStrategy'
const kRequestContext = Symbol('request context')

function strategyFactory({ name, strategy }) {
  return {
    name,
    storage: function () {
      const handlers = {}
      return {
        get: type => {
          return handlers[type] || null
        },
        set: (type, store) => {
          handlers[type] = store
        }
      }
    },
    deriveConstraint: strategy,
    mustMatchWhenDerived: true
  }
}

async function mercuriusDynamicSchema(fastify, opts) {
  const constraintStrategy = strategyFactory({
    name: STRATEGY_NAME,
    strategy: opts.strategy
  })

  fastify.addConstraintStrategy(constraintStrategy)

  const contextFn = opts.context

  for (const schema of opts.schemas) {
    await fastify.register(
      async childServer => {
        childServer.register(mercurius, {
          schema: schema.schema,
          resolvers: schema.resolvers,
          graphiql: false,
          routes: false
        })

        const persistedQueryProvider =
          childServer.persistedQuery?.provider ?? {}

        const execute = Object.keys(persistedQueryProvider).length
          ? createPersistedQueryExecutor(persistedQueryProvider, executeQuery)
          : executeRegularQuery

        childServer.route({
          path: schema?.path ?? '/graphql',
          method: 'POST',
          constraints: { [STRATEGY_NAME]: schema.name },
          handler: async (req, reply) => {
            let { query, variables, extensions } = req.body

            if (typeof req.body === 'string') {
              query = req.body
            }

            if (contextFn) {
              req[kRequestContext] = await contextFn(req, reply)
              Object.assign(req[kRequestContext], { reply, childServer })
            } else {
              req[kRequestContext] = { reply, app: childServer }
            }

            return execute(
              {
                query,
                variables: variables && tryJSONParse(req, variables),
                extensions: extensions && tryJSONParse(req, extensions)
              },
              req,
              reply
            )
          }
        })
      },
      { name: `${PLUGIN_NAME}.${schema.name}` }
    )
  }
}

async function executeQuery(query, variables, operationName, request, reply) {
  // Handle the query, throwing an error if required
  return reply.graphql(
    query,
    Object.assign(request[kRequestContext], {
      __currentQuery: query
    }),
    variables,
    operationName
  )
}

function executeRegularQuery(body, request, reply) {
  const { query, operationName, variables } = body
  return executeQuery(query, variables, operationName, request, reply)
}

function tryJSONParse(request, value) {
  try {
    return JSON.parse(value)
  } catch (err) {
    const wrap = new MER_ERR_GQL_VALIDATION()
    err.code = wrap.code
    err.statusCode = wrap.statusCode
    throw err
  }
}

module.exports = fp(mercuriusDynamicSchema, {
  fastify: '4.x',
  name: PLUGIN_NAME
})
module.exports.default = mercuriusDynamicSchema
module.exports.mercuriusDynamicSchema = mercuriusDynamicSchema
