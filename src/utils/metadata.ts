/**
 * Fetch metadata for a URL using the Microlink API (free tier).
 * This avoids CORS issues by using a dedicated API.
 */
export interface UrlMetadata {
    title: string | null;
    description: string | null;
    image: string | null;
    logo: string | null;
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata | null> {
    try {
        const encodedUrl = encodeURIComponent(url);
        const api = `https://api.microlink.io?url=${encodedUrl}`;

        const response = await fetch(api);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.status !== 'success' || !data.data) return null;

        const { title, description, image, logo } = data.data;

        return {
            title: title || null,
            description: description || null,
            image: image?.url || null,
            logo: logo?.url || null
        };
    } catch (err) {
        console.error('Failed to fetch metadata:', err);
        return null;
    }
}
