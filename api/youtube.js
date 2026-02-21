const searchAPI = require('youtube-search-api');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const fullQuery = `${query} exercise tutorial elite technique`;
        const result = await searchAPI.GetListByKeyword(fullQuery, false, 3);

        if (result && result.items && result.items.length > 0) {
            const bestVideo = result.items.find(v => v.type === 'video') || result.items[0];
            return res.status(200).json({
                id: bestVideo.id,
                title: bestVideo.title,
                duration: bestVideo.length?.simpleText || ''
            });
        }

        return res.status(404).json({ error: 'No videos found' });
    } catch (error) {
        console.error('YouTube search error:', error);
        return res.status(500).json({ error: 'Failed to fetch video' });
    }
}
