import { db } from "../index";
import { users, feeds, feedFollows, posts } from "../../../schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUserByName(name: string) {
  const [user] = await db.select().from(users).where(eq(users.name, name)).limit(1);
  return user;
}

export async function resetUsers() {
  await db.delete(posts);
  await db.delete(feedFollows);
  await db.delete(feeds);
  await db.delete(users);
}

export async function getUsers() {
  return await db.select().from(users);
}

export async function createFeed(name: string, url: string, userId: number) {
  const [result] = await db.insert(feeds).values({ name, url, userId }).returning();
  await db.insert(feedFollows).values({ userId, feedId: result.id });
  return result;
}

export async function getAllFeedsWithUsers() {
  return await db
    .select({
      feedName: feeds.name,
      feedUrl: feeds.url,
      userName: users.name,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

export async function followFeed(userId: number, feedUrl: string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, feedUrl)).limit(1);
  if (!feed) {
    throw new Error("Feed not found");
  }

  const [followRecord] = await db
    .insert(feedFollows)
    .values({ userId, feedId: feed.id })
    .returning();

  return {
    follow: followRecord,
    feedName: feed.name,
    userName: ""
  };
}

export async function getFeedFollowsForUser(userId: number) {
  return await db
    .select({
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId));
}

export async function unfollowFeed(userId: number, feedUrl: string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, feedUrl)).limit(1);
  if (!feed) {
    throw new Error("Feed not found");
  }

  await db
    .delete(feedFollows)
    .where(and(eq(feedFollows.userId, userId), eq(feedFollows.feedId, feed.id)));
}

export async function markFeedFetched(feedId: number) {
  await db
    .update(feeds)
    .set({
      lastFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, feedId));
}

export async function getNextFeedToFetch() {
  const [feed] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);
  return feed;
}

export async function createPost(title: string, url: string, description: string | null, publishedAt: Date | null, feedId: number) {
  try {
    await db
      .insert(posts)
      .values({ title, url, description, publishedAt, feedId })
      .onConflictDoNothing({ target: posts.url });
  } catch (err) {
    // Ignore duplicate key values gracefully
  }
}

export async function getPostsForUser(userId: number, limit: number) {
  const followedFeeds = await db
    .select({ feedId: feedFollows.feedId })
    .from(feedFollows)
    .where(eq(feedFollows.userId, userId));

  if (followedFeeds.length === 0) {
    return [];
  }

  const feedIds = followedFeeds.map(f => f.feedId);

  return await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(inArray(posts.feedId, feedIds))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}
