# Mercurius dynamic schema 

** This plugin is just a proof of concept **

Sometimes can be useful to serve a different schema per request, in order to achieve this result the mercurius dynamic schema plugin can be used.

## Import deps

```js
const Fastify = require("fastify");
const mercurius = require("mercurius");
const mercuriusDynamicSchema = require("..");
```

## Define schema and resolvers

```js
const app = Fastify({
  logger: true,
});

// Schema 1 definition
const schema = `
    type Query {
      add(x: Int, y: Int): Int
    }
  `;

const resolvers = {
  Query: {
    add: async (_, obj) => {
      const { x, y } = obj;
      return x + y;
    },
  },
};

// Schema 2 definition
const schema2 = `
    type Query {
      subtract(x: Int, y: Int): Int
    }
  `;

const resolvers2 = {
  Query: {
    subtract: async (_, obj) => {
      const { x, y } = obj;
      return x - y;
    },
  },
};
```

## Register the plugin

```js
app.register(mercuriusDynamicSchema, {
  schemas: [
    {
      name: "schema1",
      schema: schema,
      resolvers: resolvers,
      path: "/",
    },
    {
      name: "schema2",
      schema: schema2,
      resolvers: resolvers2,
      path: "/",
    },
  ],
  strategy: (req, ctx) => {
    return req.headers?.schema || "schema1";
  },
});

app.listen({ port: 3000 });
```

This plugin is a draft coming from a discovery session documented here [here](./docs/discovery.md)
