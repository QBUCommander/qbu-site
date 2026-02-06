export default async function handler(req, res) {
    // Allow requests from your site
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // Cache 5 min

    const substackUrl = req.query.url;

    if (!substackUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        // Try Substack API first (returns JSON)
        const apiUrl = substackUrl.replace(/\/$/, '') + '/api/v1/posts?limit=10';
        
        let posts = [];

        try {
            const apiResponse = await fetch(apiUrl, {
                headers: { 'User-Agent': 'QBU-Vibraline/1.0' }
            });
            
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                posts = data.map(p => ({
                    title: p.title || '',
                    date: p.post_date || '',
                    link: p.canonical_url || `${substackUrl}/p/${p.slug}`,
                    excerpt: p.subtitle || p.description || '',
                    type: p.type || 'newsletter'
                }));
            }
        } catch (e) {
            // API didn't work, fall through to RSS
        }

        // Fallback: RSS feed
        if (posts.length === 0) {
            const feedUrl = substackUrl.replace(/\/$/, '') + '/feed';
            const feedResponse = await fetch(feedUrl, {
                headers: { 'User-Agent': 'QBU-Vibraline/1.0' }
            });

            if (feedResponse.ok) {
                const xml = await feedResponse.text();
                
                // Simple XML parsing (no dependencies needed)
                const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
                
                posts = items.slice(0, 10).map(item => {
                    const getTag = (tag) => {
                        const match = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
                        return match ? match[1].trim() : '';
                    };

                    // Strip HTML from description
                    const rawDesc = getTag('description');
                    const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').substring(0, 200);

                    return {
                        title: getTag('title'),
                        date: getTag('pubDate'),
                        link: getTag('link'),
                        excerpt: cleanDesc,
                        type: 'newsletter'
                    };
                });
            }
        }

        if (posts.length === 0) {
            return res.status(502).json({ error: 'Could not fetch from Substack' });
        }

        return res.status(200).json({ posts });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
