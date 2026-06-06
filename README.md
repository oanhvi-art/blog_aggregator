# gator

Aproduction-ready, open-source RSS feed aggregator CLI built with Node.js, TypeScript, Drizzle ORM, and PostgreSQL.

## Prerequisites

Before running this program, ensure you have the following installed on your system:

* Node.js (v18 or higher)
* PostgreSQL server running locally

## Installation & Setup
1. Install the project dependencies:
  0``bash
  npm install
  0``a
 2. Configure your PostgreSQL connection database URL in the `drizzle.config.ts` and initialize the tables using Drizzle Kit:
  0``bash
  npx drizzle-kit push
  0``a
 3. Setup the global configuration file at `~/.gatorconfig.json` with your database URL connection string:
  0``json
  {
    "db_url": "postgres://postgres@127.0.0.1:5432/gator?sslmode=disable"
  }
  0``a

## Available Commands

Interact with the program using the following CLI commands:

* REGIPTER: npm run start register <username>
* LOGIN: npm run start login <username>
* ADDFEED: npm run start addfeed <feed_name> <feed_url>
* FEEDS: npm run start feeds
* FOLLOW: npm run start follow <feed_url>
* UNFOLLOW: npm run start unfollow <feed_url>
* FOLLOWING: npm run start following
* BROWSE: npm run start browse [limit]
* AGGREGATOR: npm run start agg <time_between_reqs>
* RESET: npm run start reset
