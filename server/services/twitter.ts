const BASE_URL = "https://api.x.com";

function getToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN environment variable is not set");
  return token;
}

async function xFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API error ${res.status}: ${body}`);
  }

  return res.json();
}

export interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    impression_count: number;
  };
}

export async function resolveUserId(username: string): Promise<string> {
  const data = await xFetch(`/2/users/by/username/${username}`);
  if (!data.data?.id) {
    throw new Error(`User @${username} not found on X`);
  }
  return data.data.id;
}

export async function fetchTweets(username: string, count: number = 50): Promise<XTweet[]> {
  const userId = await resolveUserId(username);

  const params = new URLSearchParams({
    max_results: String(Math.min(count, 100)),
    "tweet.fields": "public_metrics,created_at",
    exclude: "retweets,replies",
  });

  const data = await xFetch(`/2/users/${userId}/tweets?${params}`);

  if (!data.data || data.data.length === 0) {
    throw new Error(`No public tweets found for @${username}`);
  }

  return data.data as XTweet[];
}
