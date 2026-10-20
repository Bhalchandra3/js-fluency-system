# JsFluencySystem

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.26.

## Daily Project Startup

When opening the project fresh for a development session:

### 1. Navigate to the project

Open a terminal in the repository root (`js-fluency-system`). From a parent directory in PowerShell:

```powershell
cd .\js-fluency-system
```

If the repo is already open in your editor, use that folder as the working directory for the commands below.

### 2. Install dependencies

Run this when dependencies have changed, after pulling new changes, or after a fresh clone:

```bash
npm install
```

### 3. Generate the Prisma Client

Run this after Prisma schema changes or when the generated Prisma Client is missing/outdated:

```bash
npx prisma generate
```

### 4. Start the local application

To run the Angular frontend together with the Vercel API locally:

```bash
npx vercel dev
```

The application will normally be available at:

```text
http://localhost:3000
```

### 5. Start Prisma Studio when database work is required

Open a separate terminal in the project root:

```bash
npx prisma studio
```

Prisma Studio can be used to inspect the Neon database.

### Daily Startup — Quick Version

For a normal development session, the main command is:

```powershell
# from the repository root
npx vercel dev
```

Use these only when required:

```bash
npm install
npx prisma generate
npx prisma studio
```

## Development server

To start the Angular development server directly, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

For normal development of this project, `npx vercel dev` should be preferred because the project also contains Vercel serverless API routes.

## Prisma Database Commands

### Generate Prisma Client

Run after changes to `prisma/schema.prisma`:

```bash
npx prisma generate
```

### Create and apply a database migration

When the Prisma schema contains a database structure change:

```bash
npx prisma migrate dev --name <migration-name>
```

Example:

```bash
npx prisma migrate dev --name add-code-snippet
```

### Seed the database

After the seed configuration and seed script are ready:

```bash
npx prisma db seed
```

### Open Prisma Studio

```bash
npx prisma studio
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics, run:

```bash
ng generate --help
```

## Building

To build the project, run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the Karma test runner, use:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Postman Desktop (local API QA)

Git-managed collection source: `postman/collections/Backend/` (display name **JavaScript Fluency System API - Local**).

1. Start the app with `npx vercel dev` (`http://localhost:3000`).
2. In Postman Desktop, use the imported collection **JavaScript Fluency System API - Local** with environment **Local Development**.
3. Set `bearerToken` as a Desktop **Current value** only (matches local `BEARER_TOKEN`). Do not commit tokens.
4. To regenerate Desktop import JSON (gitignored under `postman/exports/`):

```bash
python postman/scripts/export_v21_for_desktop.py
```

Phase 3 Postman/local API QA notes: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) §5.4. Phase 3 is complete; no active phase step until Phase 4 starts.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
