SQLite

Copy Markdown
Open
Create a new TypeScript project from scratch by connecting Prisma ORM to SQLite and generating a Prisma Client for database access

SQLite is a lightweight, file-based database that's perfect for development, prototyping, and small applications. It requires no setup and stores data in a local file.

In this guide, you will learn how to set up a new TypeScript project from scratch, connect it to SQLite using Prisma ORM, and generate a Prisma Client for easy, type-safe access to your database.

Prerequisites
1. Create a new project
Create a project directory and navigate into it:


mkdir hello-prisma
cd hello-prisma
Initialize a TypeScript project:

npm
pnpm
yarn
bun

pnpm init
pnpm add typescript tsx @types/node --save-dev
pnpm dlx tsc --init
2. Install required dependencies
Install the packages needed for this quickstart:

npm
pnpm
yarn
bun

pnpm add prisma @types/node @types/better-sqlite3 -D
npm
pnpm
yarn
bun

pnpm add @prisma/client @prisma/adapter-better-sqlite3 dotenv
pnpm users with SQLite
If using pnpm 10+ with pnpx, you'll need the --allow-build=better-sqlite3 flag when running Prisma Studio due to SQLite's native dependency requirements.

Here's what each package does:

prisma - The Prisma CLI for running commands like prisma init, prisma migrate, and prisma generate
@prisma/client - The Prisma Client library for querying your database
@prisma/adapter-better-sqlite3 - The SQLite driver adapter that connects Prisma Client to your database
@types/better-sqlite3 - TypeScript type definitions for better-sqlite3
dotenv - Loads environment variables from your .env file
3. Configure ESM support
Update tsconfig.json for ESM compatibility:

tsconfig.json

{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true,
    "ignoreDeprecations": "6.0"
  }
}
Update package.json to enable ESM:

package.json

{
  "type": "module"
}
4. Initialize Prisma ORM
You can now invoke the Prisma CLI by prefixing it with npx:

npm
pnpm
yarn
bun

pnpm dlx prisma
Next, set up your Prisma ORM project by creating your Prisma Schema file with the following command:

npm
pnpm
yarn
bun

pnpm dlx prisma init --datasource-provider sqlite --output ../generated/prisma
This command does a few things:

Creates a prisma/ directory with a schema.prisma file containing your database connection and schema models
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
  provider = "sqlite"
}
A .env file should be created with the following value:

.env

DATABASE_URL="file:./dev.db"
5. Define your data model
Open prisma/schema.prisma and add the following models:

prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
datasource db {
  provider = "sqlite"
}
model User { 
  id    Int     @id @default(autoincrement()) 
  email String  @unique
  name  String?
  posts Post[]
} 
model Post { 
  id        Int     @id @default(autoincrement()) 
  title     String
  content   String?
  published Boolean @default(false) 
  author    User    @relation(fields: [authorId], references: [id]) 
  authorId  Int
} 
6. Create and apply your first migration
Create your first migration to set up the database tables:

npm
pnpm
yarn
bun

pnpm dlx prisma migrate dev --name init
This command creates the database tables based on your schema.

Now run the following command to generate the Prisma Client:

npm
pnpm
yarn
bun

pnpm dlx prisma generate
7. Instantiate Prisma Client
Now that you have all the dependencies installed, you can instantiate Prisma Client. You need to pass an instance of the Prisma ORM driver adapter adapter to the PrismaClient constructor:

lib/prisma.ts

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });
export { prisma };
Using SQLite with Bun
When targeting Bun, use the @prisma/adapter-libsql adapter instead of @prisma/adapter-better-sqlite3. Bun doesn’t support the native SQLite driver that better-sqlite3 relies on (see the node:sqlite reference). Instantiate Prisma Client like so:


import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });
export { prisma };
8. Write your first query
Create a script.ts file to test your setup:

script.ts

import { prisma } from "./lib/prisma";
async function main() {
  // Create a new user with a post
  const user = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@prisma.io",
      posts: {
        create: {
          title: "Hello World",
          content: "This is my first post!",
          published: true,
        },
      },
    },
    include: {
      posts: true,
    },
  });
  console.log("Created user:", user);
  // Fetch all users with their posts
  const allUsers = await prisma.user.findMany({
    include: {
      posts: true,
    },
  });
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
You should see the created user and all users printed to the console!

9. Explore your data with Prisma Studio
To view SQLite databases within Prisma Studio:

File paths must have a file: protocol right now in the database URL for SQLite
Node.js 22.5+: Works out of the box with the built-in node:sqlite module
May require NODE_OPTIONS=--experimental-sqlite environment variable
Node.js 20: Requires installing better-sqlite3 as a dependency
If using pnpm 10+ with pnpx, you'll need the --allow-build=better-sqlite3 flag
Deno >= 2.2: Supported via built-in SQLite module
Bun: Support for Prisma Studio with SQLite is coming soon and is not available yet
If you don't have node:sqlite available in your runtime or prefer not to install better-sqlite3 as a hard dependency, you can use npx to temporarily install the required packages:

npm
pnpm
yarn
bun

pnpm dlx -p better-sqlite3 -p prisma prisma studio --url file:./dev.db
This command:

Temporarily installs better-sqlite3 without adding it to your project dependencies
Runs Prisma Studio with the specified SQLite database file
Avoids the 10MB overhead of better-sqlite3 in your project