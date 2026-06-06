import { readConfig, writeConfig } from "./config";
import { createUser, getUserByName, resetUsers, getUsers, createFeed, getAllFeedsWithUsers, followFeed, getFeedFollowsForUser, unfollowFeed, getNextFeedToFetch, markFeedFetched, createPost, getPostsForUser } from "./lib/db/queries/users";
import { fetchFeed } from "./lib/utils/rss";
import { users as usersTable, feeds as feedsTable } from "./schema";

type CommandHandler = (args: string[]) => Promise<void>;
type User = typeof usersTable.$inferSelect;
type Feed = typeof feedsTable.$inferSelect;

type UserCommandHandler = (
  user: User,
  args: string[]
) => Promise<void>;

function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (args: string[]) => {
    const config = readConfig();
    if (!config.current_user_name) {
      process.exit(1);
    }

    const user = await getUserByName(config.current_user_name);
    if (!user) {
      process.exit(1);
    }

    await handler(user, args);
  };
}

function printFeed(feed: Feed, user: User) {
  console.log(`ID: ${feed.id}`);
  console.log(`Name: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User: ${user.name}`);
  console.log(`Created At: ${feed.createdAt}`);
  console.log(`Updated At: ${feed.updatedAt}`);
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) {
    throw new Error("Invalid duration format");
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms": return value;
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    default: return 0;
  }
}

async function scrapeFeeds() {
  const nextFeed = await getNextFeedToFetch();
  if (!nextFeed) {
    console.log("No feeds found to fetch.");
    return;
  }

  console.log(`Fetching feed: ${nextFeed.name} (${nextFeed.url})`);
  try {
    const parsedFeed = await fetchFeed(nextFeed.url);
    await markFeedFetched(nextFeed.id);

    for (const item of parsedFeed.channel.item) {
      let pubDate: Date | null = null;
      if (item.pubDate) {
        const parsedDate = Date.parse(item.pubDate);
        if (!isNaN(parsedDate)) {
          pubDate = new Date(parsedDate);
        }
      }
      await createPost(item.title, item.link, item.description || null, pubDate, nextFeed.id);
    }
    console.log(`Saved ${parsedFeed.channel.item.length} posts from ${nextFeed.name}`);
  } catch (err) {
    console.error(`Error scraping feed ${nextFeed.name}:`, err);
  }
}

const commands: Record<string, CommandHandler> = {
  login: async (args) => {
    if (args.length < 1) {
      process.exit(1);
    }
    const username = args[0];
    const user = await getUserByName(username);
    if (!user) {
      process.exit(1);
    }
    const config = readConfig();
    config.current_user_name = username;
    writeConfig(config);
    process.exit(0);
  },
  register: async (args) => {
    if (args.length < 1 || !args[0]) {
      process.exit(1);
    }
    const username = args[0];
    const existingUser = await getUserByName(username);
    if (existingUser) {
      process.exit(1);
    }
    await createUser(username);
    const config = readConfig();
    config.current_user_name = username;
    writeConfig(config);
    process.exit(0);
  },
  reset: async () => {
    try {
      await resetUsers();
      console.log("Database reset successfully");
      process.exit(0);
    } catch (err) {
      console.error("Failed to reset database", err);
      process.exit(1);
    }
  },
  users: async () => {
    const allUsers = await getUsers();
    const config = readConfig();
    const currentUser = config.current_user_name;

    for (const user of allUsers) {
      if (user.name === currentUser) {
        console.log(`* ${user.name} (current)`);
      } else {
        console.log(`* ${user.name}`);
      }
    }
    process.exit(0);
  },
  agg: async (args) => {
    if (args.length < 1 || !args[0]) {
      process.exit(1);
    }

    let timeBetweenRequests: number;
    try {
      timeBetweenRequests = parseDuration(args[0]);
    } catch (err) {
      process.exit(1);
    }

    console.log(`Collecting feeds every ${args[0]}`);

    await scrapeFeeds().catch(console.error);

    const interval = setInterval(() => {
      scrapeFeeds().catch(console.error);
    }, timeBetweenRequests);

    await new Promise<void>((resolve) => {
      process.on("SIGINT", () => {
        console.log("\nShutting down feed aggregator...");
        clearInterval(interval);
        resolve();
        process.exit(0);
      });
    });
  },
  addfeed: middlewareLoggedIn(async (user, args) => {
    if (args.length < 2 || !args[0] || !args[1]) {
      process.exit(1);
    }
    const name = args[0];
    const url = args[1];

    try {
      const feed = await createFeed(name, url, user.id);
      printFeed(feed, user);
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }),
  feeds: async () => {
    try {
      const allFeeds = await getAllFeedsWithUsers();
      for (const item of allFeeds) {
        console.log(`* Name: ${item.feedName}`);
        console.log(`  URL: ${item.feedUrl}`);
        console.log(`  User: ${item.userName}`);
      }
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  },
  follow: middlewareLoggedIn(async (user, args) => {
    if (args.length < 1 || !args[0]) {
      process.exit(1);
    }
    const url = args[0];

    try {
      const result = await followFeed(user.id, url);
      console.log(`Feed: ${result.feedName}`);
      console.log(`User: ${user.name}`);
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }),
  following: middlewareLoggedIn(async (user) => {
    try {
      const follows = await getFeedFollowsForUser(user.id);
      for (const f of follows) {
        console.log(`* ${f.feedName}`);
      }
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }),
  unfollow: middlewareLoggedIn(async (user, args) => {
    if (args.length < 1 || !args[0]) {
      process.exit(1);
    }
    const url = args[0];

    try {
      await unfollowFeed(user.id, url);
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }),
  browse: middlewareLoggedIn(async (user, args) => {
    let limit = 2;
    if (args.length > 0 && args[0]) {
      const parsedLimit = parseInt(args[0], 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      }
    }

    try {
      const userPosts = await getPostsForUser(user.id, limit);
      if (userPosts.length === 0) {
        console.log("No posts found from the feeds you follow.");
        process.exit(0);
      }

      for (const post of userPosts) {
        console.log(`\n--- ${post.title} ---`);
        console.log(`Published: ${post.publishedAt ? post.publishedAt.toUTCString() : "Unknown"}`);
        console.log(`Link: ${post.url}`);
        console.log(`Description: ${post.description || "No description provided."}`);
      }
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    process.exit(1);
  }
  const command = args[0];
  const cmdArgs = args.slice(1);

  const handler = commands[command];
  if (!handler) {
    process.exit(1);
  }

  await handler(cmdArgs);
}

main().catch(() => process.exit(1));
