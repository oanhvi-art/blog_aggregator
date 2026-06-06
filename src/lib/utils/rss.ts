import { XMLParser } from "fast-xml-parser";

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface RSSFeed {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }

  const xmlString = await response.text();
  
  const parser = new XMLParser({
    processEntities: false,
    ignoreAttributes: false,
    restorePosition: Array.isArray
  });
  
  const jsonObj = parser.parse(xmlString);

  if (!jsonObj.rss || !jsonObj.rss.channel) {
    throw new Error("Invalid RSS feed: missing channel field");
  }

  const channelData = jsonObj.rss.channel;

  let parsedItems: RSSItem[] = [];
  if (channelData.item) {
    const itemsRaw = Array.isArray(channelData.item) ? channelData.item : [channelData.item];
    for (const item of itemsRaw) {
      if (item && item.title !== undefined && item.link !== undefined) {
        parsedItems.push({
          title: String(item.title || ""),
          link: String(item.link || ""),
          description: String(item.description || ""),
          pubDate: String(item.pubDate || ""),
        });
      }
    }
  }

  return {
    channel: {
      title: String(channelData.title || ""),
      link: String(channelData.link || ""),
      description: String(channelData.description || ""),
      item: parsedItems,
    },
  };
}
