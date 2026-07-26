// GIF search via Giphy (free API). Requires a key at build time as VITE_GIPHY_KEY.
// Without it the picker shows a friendly setup note.

const KEY = import.meta.env.VITE_GIPHY_KEY as string | undefined;

export function gifsConfigured(): boolean {
  return !!KEY;
}

export interface Gif {
  id: string;
  url: string; // full-size (sent)
  preview: string; // small (grid)
}

export async function searchGifs(q: string): Promise<Gif[]> {
  if (!KEY) return [];
  const base = q.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&bundle=messaging_non_clips`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${KEY}&limit=24&rating=pg-13&bundle=messaging_non_clips`;
  try {
    const res = await fetch(base);
    const data = await res.json();
    return (data.data || []).map((g: any) => ({
      id: g.id,
      url: g.images?.original?.url,
      preview: g.images?.fixed_width_downsampled?.url || g.images?.fixed_width?.url || g.images?.original?.url,
    }));
  } catch {
    return [];
  }
}
