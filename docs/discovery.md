# Discovery session: Allow Mercurius to expose conditionally multiple schemas (Wip).

Problem:

During a discovery session on GraphQL libraries for different frameworks and languages, I saw that most libraries are framework-agnostic.

One example came from the rust world using Actix and juniper:

In the following code snippet, the executor is initialized ahead of time, but it is schema-agnostic. This makes it possible to handle different schemas in the route handler scope,

```rust
use actix_web::{get, route, web, Error, HttpResponse, Responder};
use actix_web_lab::respond::Html;
use juniper::http::{graphiql::graphiql_source, GraphQLRequest};

use crate::{
    db::Pool,
    schemas::root::{create_schema, Context, Schema},
};

/// GraphQL endpoint
#[route("/graphql", method = "GET", method = "POST")]
pub async fn graphql(
    pool: web::Data<Pool>,
    schema: web::Data<Schema>,
    data: web::Json<GraphQLRequest>,
) -> Result<HttpResponse, Error> {
    let ctx = Context {
        db_pool: pool.get_ref().to_owned(),
    };

    let res = data.execute(&schema, &ctx).await;

    Ok(HttpResponse::Ok().json(res))
}
```

A similar approach is made in the JVM world, here a scala example using sangria

```scala
val result: Future[Json] =
  Executor.execute(schema, query, new ProductRepo)

// server

object Server extends App {
  implicit val system = ActorSystem("sangria-server")
  implicit val materializer = ActorMaterializer()

  import system.dispatcher

  val route: Route =
    (post & path("graphql")) {
      entity(as[JsValue]) { requestJson =>
        graphQLEndpoint(requestJson)
      }
    }
  Http().bindAndHandle(route, "0.0.0.0", 8080)
}

// Graphql executor

def graphQLEndpoint(requestJson: JsValue) = {
  val JsObject(fields) = requestJson

  val JsString(query) = fields("query")

  ...

  QueryParser.parse(query) match {
**    // query parsed successfully. Time to execute it!
    case Success(queryAst) =>
      complete(executeGraphQLQuery(queryAst, operation, vars))

    // can't parse GraphQL query, return error
    case Failure(error) =>
      complete(BadRequest, JsObject("error" -> JsString(error.getMessage)))
  }
}

def executeGraphQLQuery(query: Document, op: Option[String], vars: JsObject) =
  Executor.execute(schema, query, new ProductRepo, variables = vars, operationName = op)
    .map(OK -> _)
    .recover {
      case error: QueryAnalysisError => BadRequest -> error.resolveError
      case error: ErrorWithResolver => InternalServerError -> error.resolveError
    }

```

Similar approaches are seen in the .net, go and ruby world.

With apollo is achieved using the plugin system

```jsx
import {execute, parse} from "graphql";
import {ApolloServer} from "apollo-server-koa";
...
const defaultRole = "user";

const apolloServer = new ApolloServer({
  schema: await getSchemaForRole(defaultRole),
  context: ({ ctx }) => {
    ...
  },
  plugins: [{
    requestDidStart: () => ({
      responseForOperation: async operation => {
        const {context, request} = operation;
        const {query, variables, operationName} = request;
        const {role} = context.user;
        // dynamically select the schema based on the current user's role
        const schema = await getSchemaForRole(role || defaultRole);
        return execute(schema, parse(query), null, context, variables, operationName);
      }
    })
  }]
});

apolloServer.applyMiddleware({ app });
```

Currently, Mercurius expose a single schema, we can initialise mercurius with multiple schemas, but they will be stitched together, and we end up with just one initialised schema.

This is because although most of the executor logic is included in the fastifyGraphQL object (which I imagine can be de-coupled to allow multiple instantiations), multiple features rely on plugin scope ex. the subscription, LRU cache and data loaders.

Due to this, decoupling fastifyGraphQL becomes difficult without doing a huge refactoring.

With Mercurius, it can be achieved using the fastify plugin system and the fastify/find my way route constraint feature, as exposed [here](https://github.com/mercurius-js/mercurius/pull/979). It still seems hackish.

A possible api approach could look like this:

```jsx
const app = Fastify()
const schema1 = makeExecutableSchema({
  typeDefs: ...
  resolvers: ...
})
const schema2 = makeExecutableSchema({
  typeDefs: ...
  resolvers: ...
})

app.register(mercurius, {
  schemas: [
	{
		schema: schema1,
		constraint: async (req, res) => {
			return true
		},
		{
		schema: schema2,
		constraint: async (req, res) => {
			return false
		}
	}],
})
```
