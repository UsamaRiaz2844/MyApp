// Reels feed powered by YouTube Shorts (embedding YouTube is allowed; Instagram
// is not). Needs a free YouTube Data API key at build time as VITE_YOUTUBE_KEY.

const KEY = import.meta.env.VITE_YOUTUBE_KEY as string | undefined;

export function reelsConfigured(): boolean {
  return !!KEY;
}

export interface Reel {
  id: string;
  title: string;
  channel: string;
  thumb: string;
}

// A rotating set of queries so the feed feels endless and varied.
const QUERIES = [
  'funny shorts',
  'satisfying shorts',
  'football shorts',
  'cricket shorts',
  'comedy shorts',
  'cute animals shorts',
  'street food shorts',
  'travel shorts',
  'music shorts',
  'magic tricks shorts',
  'life hacks shorts',
  'dance shorts',
  'gaming shorts',
  'science shorts',
];

export async function fetchReels(): Promise<Reel[]> {
  if (!KEY) return [];
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short` +
    `&maxResults=20&safeSearch=moderate&q=${encodeURIComponent(q)}&key=${KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return ((data.items || []) as any[])
      .filter((i) => i.id?.videoId)
      .map((i) => ({
        id: i.id.videoId,
        title: i.snippet?.title || '',
        channel: i.snippet?.channelTitle || '',
        thumb: i.snippet?.thumbnails?.high?.url || i.snippet?.thumbnails?.medium?.url || '',
      }));
  } catch {
    return [];
  }
}
