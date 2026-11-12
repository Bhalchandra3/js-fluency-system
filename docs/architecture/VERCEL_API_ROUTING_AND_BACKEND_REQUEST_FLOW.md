# Vercel API Routing and Backend Request Flow

## Purpose

This document explains how the JavaScript Fluency System exposes backend
API endpoints through Vercel, how an incoming request reaches the
backend service, and why endpoint files are separated from shared
backend logic.

## 1. How Vercel maps files to API endpoints

The project uses Vercel's filesystem-based API routing.

Files placed under the root-level `api/` directory are used to define
serverless API functions. The file path determines the URL path.

### Examples from this project

  Project file                   API route
  ------------------------------ ---------------------------
  `api/health.ts`                `/api/health`
  `api/topics/index.ts`          `/api/topics`
  `api/revision/today.ts`        `/api/revision/today`
  `api/revision/answers.ts`      `/api/revision/answers`
  `api/revision/complete.ts`     `/api/revision/complete`
  `api/deep-dive/[topicId].ts`   `/api/deep-dive/:topicId`

The HTTP method is handled by the exported handler in the corresponding
file. For example, the revision endpoint file can accept `GET` or `POST`
requests depending on the method checks and handler logic implemented in
that file.

### Dynamic routes

Square brackets in a filename represent a dynamic route segment.

For example:

``` text
api/deep-dive/[topicId].ts
```

matches a URL such as:

``` text
/api/deep-dive/abc123
```

The value `abc123` is made available to the function as a route
parameter. The endpoint handler decides how to validate and use it.

> The route mapping above describes the project's Vercel API structure.
> Confirm any special routing overrides in `vercel.json` or other
> deployment configuration if that configuration is added or changed.

## 2. How a request reaches the business logic

For `GET /api/revision/today`, the request flow is:

``` text
Postman or Angular
       |
       | GET /api/revision/today
       v
Vercel routing
       |
       | Resolves the matching API file
       v
api/revision/today.ts
       |
       | Handles HTTP request, method, authentication,
       | invokes service, and sends HTTP response
       v
api/_lib/revision/todayService.ts
       |
       | Executes revision-related business logic
       v
Shared backend utilities
       |
       | For example: Prisma client and scheduling helpers
       v
Neon PostgreSQL
```

The response travels back through the same layers:

``` text
Neon PostgreSQL
       |
       v
Service result
       |
       v
API handler
       |
       v
Vercel HTTP response
       |
       v
Postman or Angular
```

### Responsibility of each layer

1.  **Vercel routing** identifies the API function that matches the
    requested URL.
2.  **Endpoint handler** receives the request, checks the HTTP method,
    performs request-level validation and authentication as implemented,
    calls the relevant service, and returns an HTTP response.
3.  **Service layer** performs the feature's business logic. For Today's
    Revision, this includes the revision-session and due-topic logic
    implemented in the service.
4.  **Shared utilities** provide reusable capabilities such as database
    access, authentication helpers, error definitions, and scheduling
    functions.
5.  **Prisma and Neon PostgreSQL** provide database access and
    persistent storage.

The exact sequence and responsibilities must be confirmed by reading the
endpoint and service files. This diagram describes the intended
separation of concerns, not a substitute for inspecting the
implementation.

## 3. Why the project has both `api/` and `api/_lib/`

These directories have different responsibilities.

  -----------------------------------------------------------------------
  Directory                           Responsibility
  ----------------------------------- -----------------------------------
  `api/`                              HTTP endpoint entry points: request
                                      handling, authentication
                                      integration, service invocation,
                                      and HTTP responses

  `api/_lib/`                         Shared backend implementation:
                                      services, helpers, database access,
                                      scheduling logic, and reusable
                                      error handling
  -----------------------------------------------------------------------

### Example: Today's Revision

**Endpoint file**

``` text
api/revision/today.ts
```

This is the HTTP entry point for:

``` text
GET /api/revision/today
```

It is where you should begin when tracing the request from Postman.

**Service file**

``` text
api/_lib/revision/todayService.ts
```

This contains the Today's Revision service logic called by the endpoint.

**Shared backend files**

``` text
api/_lib/auth.ts
api/_lib/prisma.ts
api/_lib/revision/errors.ts
api/_lib/revision/sessionProgress.ts
```

These provide shared functionality used by endpoint handlers or
services.

### Why keep the layers separate?

-   Endpoint handlers remain focused on HTTP concerns.
-   Business logic can be reused without duplicating it across
    endpoints.
-   Services can be tested independently or through integration tests.
-   Shared helpers can be maintained in one place.
-   It is easier to trace a request from its route to the logic that
    produces the response.

### Important note about `_lib`

The `_lib` directory is intended for internal, shared backend code
rather than public API routes. Keep endpoint entry points in the route
structure under `api/`, and keep reusable implementation code in
`_lib/`. Vercel's routing behavior should be checked against the
project's current Vercel configuration and deployment conventions if
this structure changes.

## 4. Recommended inspection path for a new endpoint

When learning or debugging an endpoint, inspect files in this order:

1.  Find the matching endpoint file under `api/`.
2.  Identify the service function it imports and calls.
3.  Open that service under `api/_lib/`.
4.  Follow any shared helpers imported by the service.
5.  Inspect the relevant Prisma models in `prisma/schema.prisma`.
6.  Read the endpoint handler tests and service integration tests.

For Today's Revision, start with:

``` text
api/revision/today.ts
api/_lib/revision/todayService.ts
```

Then follow the imports into the shared revision, scheduling,
authentication, and Prisma files as needed.
