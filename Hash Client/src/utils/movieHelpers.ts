const TMDB_BASE = 'https://image.tmdb.org/t/p';

export function getTitle(m: any): string {
  return m?.tmdb_title || m?.rt_title || m?.original_title || 'Unknown Title';
}

export function getPosterUrl(m: any): string | null {
  const path = m?.images?.posters?.[0]?.file_path;
  return path ? `${TMDB_BASE}/w342${path}` : null;
}

export function getBackdropUrl(m: any): string | null {
  const path = m?.images?.backdrops?.[0]?.file_path;
  return path ? `${TMDB_BASE}/w1280${path}` : null;
}

export function getLogoUrl(m: any): string | null {
  if (m?.logo_url) return m.logo_url;
  const logos: any[] = m?.images?.logos ?? [];
  // Prefer English logo, fall back to any
  const logo = logos.find((l) => l.iso_639_1 === 'en') ?? logos[0];
  return logo?.file_path ? `${TMDB_BASE}/w300${logo.file_path}` : null;
}

export function getTrailerKey(m: any): string | null {
  const videos: any[] = m?.videos ?? [];
  const trailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  return trailer?.key ?? null;
}

export function getYear(m: any): string | null {
  if (!m?.release_date) return null;
  return String(new Date(m.release_date).getFullYear());
}

export function getRating(m: any): string {
  if (!m?.user_rating) return '';
  return m.user_rating.toFixed(1);
}

export function getTopCast(m: any, count = 3): string {
  const cast: any[] = m?.cast ?? [];
  return cast
    .slice(0, count)
    .map((c) => c.name)
    .join(' · ');
}

// Build the YouTube embed URL for trailer preview
// muted=true (default) is required for autoplay to work on first load;
// once the iframe is loaded and trusted, the caller can swap to muted=false.
export function getTrailerEmbedUrl(key: string, muted = true): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: '0',
    disablekb: '1',
    fs: '0',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    cc_load_policy: '0',
    enablejsapi: '1',
    showinfo: '0',
  });

  if (typeof window !== 'undefined') {
    params.set('origin', window.location.origin);
  }

  // No loop params: callers listen for the ended event and fade back to artwork.
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}
