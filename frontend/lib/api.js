export const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON response (${response.status}).`);
  }
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
