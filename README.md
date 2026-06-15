# gator

A production-ready, open-source RSS feed aggregator CLI built with Node.js, TypeScript, Drizzle ORM, and PostgreSQL.

## Motivation
gator was built to provide a lightweight, terminal-based solution for aggregating and consuming RSS feeds efficiently.

## Quick Start
Get a local instance up and running in less than 2 minutes.

### Prerequisites
* Node.js (v18 or higher)
* PostgreSQL server running locally

```bash
npm install
npx drizzle-kit push
Usage
Interact with the program using the following CLI commands:

REGISTER: npm run start register

LOGIN: npm run start login

ADDFEED: npm run start addfeed <feed_name> <feed_url>

FEEDS: npm run start feeds

FOLLOW: npm run start follow <feed_url>

UNFOLLOW: npm run start unfollow <feed_url>

FOLLOWING: npm run start following

BROWSE: npm run start browse [limit]

AGGREGATOR: npm run start agg <time_between_reqs>

RESET: npm run start reset

Contributing
We welcome all contributions! Please fork the repo and open a pull request.
