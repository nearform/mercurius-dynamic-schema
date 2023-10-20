# Mercurius Dynamic Schema 

A plugin for Fastify allowing serving a different schema per request path.

Note: persisted queries are currently **not** supported.

## Table of contents

- [Installation](#installation)
- [Quickstart](#quickstart)
- [Options](#options)
- [License](#license)

## Installation

```bash
npm i fastify mercurius mercurius-dynamic-schema
```

## Quickstart

```js
const Fastify = require("fastify");
const mercuriusDynamicSchema = require("mercurius-dynamic-schema");

const app = Fastify({
  logger: true
})

const schema1 = `
    type Query {
      add(x: Int, y: Int): Int
    }
  `

const resolvers1 = {
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
      schema: schema1,
      resolvers: resolvers1,
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
  },
  context: req => {
    return { add: req.headers.add }
  }
})

app.listen({ port: 3000 })

// Use the following to test
// curl -X POST -H 'content-type: application/json' -d '{ "query": "{ add(x: 2, y: 2) }" }' localhost:3000/custom-path
// curl -X POST -H 'content-type: application/json' -d '{ "query": "{ subtract(x: 2, y: 1) }" }' localhost:3000/graphql
```

## Options

You can pass the following options when registering the plugin (all of them are optional unless stated otherwise):

| Parameter | Type | Description |
| --- | --- | --- |
| `schemas` (required) | `{ name: string; path?: string; resolvers: IResolvers, schema: string ()}[]` | An array of dynamic schema definitions (see details below).
| `strategy` (required) | `req => string` | A function that returns a strategy name from a request object. This function will get the value of the constraint from each incoming request, and is used in `deriveConstraint` of fastify's [addConstraintStrategy](https://fastify.dev/docs/latest/Reference/Server/#addconstraintstrategy)
| `context` | `req => string` | A function that returns a query context object from a request object.|

### **schemas**
Each schema definition uses the following properties

|prop | required | default | description |
|-----|----------|---------|-------------|
|name| yes | | a unique name across all schema definitions|
|schema| yes | | the GraphQl schema|
|resolvers| yes | | the resolvers corresponding to the schema defined above|
|path| no | `/graphql` | the route at which these schema and resolvers will be available|

Example (see [./examples/base.js](mercurius-dynamic-schema/blob/master/examples/base.js) for a complete example)

```js
[
  {
    name: 'schema1',
    schema,
    resolvers,
    path: '/specific-path'
  }
]
```

### **strategy**

Example: this will return the value of a header named `schema`, or default to `schema1`

```js
  req => {
    return req.headers?.schema || 'schema1'
  }
```

### **context**

Example: this will pass a context containing a prop named `add`, which has the value from a header name `add`

```js
  req => {
    return { add: req.headers.add }
  }
```

# This project also contains

- code linting with [ESlint](https://eslint.org) and [prettier](https://prettier.io)
- pre-commit code linting and commit message linting with [husky](https://www.npmjs.com/package/husky) and [commitlint](https://commitlint.js.org/)
- dependabot setup with automatic merging thanks to ["merge dependabot" GitHub action](https://github.com/fastify/github-action-merge-dependabot)
- notifications about commits waiting to be released thanks to ["notify release" GitHub action](https://github.com/nearform/github-action-notify-release)
- PRs' linked issues check with ["check linked issues" GitHub action](https://github.com/nearform/github-action-check-linked-issues)
- Continuous Integration GitHub workflow


## Examples

Check [GitHub repo](mercurius-dynamic-schema/blob/master/examples) for more examples.

## License

MIT