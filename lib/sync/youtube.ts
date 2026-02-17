export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const idPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (idPattern.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return idPattern.test(id) ? id : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v") || "";
      return idPattern.test(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}