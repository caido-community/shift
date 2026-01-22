const ALLOWED_HOSTS = [
  "gist.githubusercontent.com",
  "raw.githubusercontent.com",
  "gist.github.com",
];

export function validateSkillUrl(
  urlString: string
): { valid: true } | { valid: false; error: string } {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (url.protocol !== "https:") {
    return { valid: false, error: "URL must use HTTPS protocol" };
  }

  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return {
      valid: false,
      error: `URL hostname must be one of: ${ALLOWED_HOSTS.join(", ")}`,
    };
  }

  return { valid: true };
}
