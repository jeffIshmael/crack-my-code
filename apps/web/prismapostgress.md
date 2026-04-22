PostgreSQL

Copy Markdown
Open
Add Prisma ORM to an existing TypeScript project with PostgreSQL and learn database introspection, baselining, and querying

PostgreSQL is a popular open-source relational database known for its reliability, feature robustness, and performance. In this guide, you will learn how to add Prisma ORM to an existing TypeScript project, connect it to PostgreSQL, introspect your existing database schema, and start querying with type-safe Prisma Client.

Prerequisites
1. Set up Prisma ORM
Navigate to your existing project directory and install the required dependencies:

npm
pnpm
yarn
bun

pnpm add prisma @types/node @types/pg --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
Here's what each package does:

prisma - The Prisma CLI for running commands like prisma init, prisma db pull, and prisma generate
@prisma/client - The Prisma Client library for querying your database
@prisma/adapter-pg - The node-postgres driver adapter that connects Prisma Client to your database
pg - The node-postgres database driver
@types/pg - TypeScript type definitions for node-postgres
dotenv - Loads environment variables from your .env file
2. Initialize Prisma ORM
Set up your Prisma ORM project by creating your Prisma Schema file with the following command:

npm
pnpm
yarn
bun

pnpm dlx prisma init --datasource-provider postgresql --output ../generated/prisma
This command does a few things:

Creates a prisma/ directory with a schema.prisma file containing your database connection configuration
Creates a .env file in the root directory for environment variables
Creates a prisma.config.ts file for Prisma configuration
The generated prisma.config.ts file looks like this:

prisma.config.ts

import "dotenv/config";
import { defineConfig, env } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
The generated schema uses the ESM-first prisma-client generator with a custom output path:

prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
datasource db {
  provider = "postgresql"
}
3. Connect your database
Update the .env file with your PostgreSQL connection URL:

.env

DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
The format of the connection URL for PostgreSQL looks as follows:


postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
4. Introspect your database
Run the following command to introspect your existing database:

npm
pnpm
yarn
bun

pnpm dlx prisma db pull
This command reads the DATABASE_URL environment variable, connects to your database, and introspects the database schema. It then translates the database schema from SQL into a data model in your Prisma schema.

Introspect your database with Prisma ORM

After introspection, your Prisma schema will contain models that represent your existing database tables.

5. Baseline your database
To use Prisma Migrate with your existing database, you need to baseline your database.

First, create a migrations directory:


mkdir -p prisma/migrations/0_init
Next, generate the migration file with prisma migrate diff:

npm
pnpm
yarn
bun

pnpm dlx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
Review the generated migration file to ensure it matches your database schema.

Then, mark the migration as applied:

npm
pnpm
yarn
bun

pnpm dlx prisma migrate resolve --applied 0_init
You now have a baseline for your current database schema.

6. Generate Prisma ORM types
Generate Prisma Client based on your introspected schema:

npm
pnpm
yarn
bun

pnpm dlx prisma generate
This creates a type-safe Prisma Client tailored to your database schema in the generated/prisma directory.

7. Instantiate Prisma Client
Create a utility file to instantiate Prisma Client. You need to pass an instance of the Prisma ORM driver adapter adapter to the PrismaClient constructor:

lib/prisma.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
export { prisma };
8. Query your database
Now you can use Prisma Client to query your database. Create a script.ts file:

script.ts

import { prisma } from "./lib/prisma";
async function main() {
  // Example: Fetch all records from a table
  // Replace 'user' with your actual model name
  const allUsers = await prisma.user.findMany();
  console.log("All users:", JSON.stringify(allUsers, null, 2));
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
Run the script:

npm
pnpm
yarn
bun

pnpm dlx tsx script.ts
9. Evolve your schema
To make changes to your database schema:

9.1. Update your Prisma schema file
Update your Prisma schema file to reflect the changes you want to make to your database schema. For example, add a new model:

prisma/schema.prisma

model Post { 
  id        Int      @id @default(autoincrement()) 
  title     String
  content   String?
  published Boolean  @default(false) 
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id]) 
} 
model User { 
  id    Int    @id @default(autoincrement()) 
  email String @unique
  name  String?
  posts Post[]
} 
9.2. Create and apply a migration:
npm
pnpm
yarn
bun

pnpm dlx prisma migrate dev --name your_migration_name
This command will:

Create a new SQL migration file
Apply the migration to your database
Regenerate Prisma Client
10. Explore your data with Prisma Studio

npx prisma studio
Next steps
You've successfully set up Prisma ORM. Here's what you can explore next:

Learn more about Prisma Client: Explore the Prisma Client API for advanced querying, filtering, and relations
Database migrations: Learn about Prisma Migrate for evolving your database schema
Performance optimization: Discover query optimization techniques
Build a full application: Check out our framework guides to integrate Prisma ORM with Next.js, Express, and more
Join the community: Connect with other developers on Discord
