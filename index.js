require('dotenv').config();
const { google } = require('googleapis');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

function extractPlaylistId(url) {
  const decodedUrl = decodeURIComponent(url);
  const cleanUrl = decodedUrl.replace(/\\/g, '');
  const match = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchAllVideos(playlistId) {
  let videos = [];
  let nextPageToken = '';

  try {
    do {
      const response = await youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        maxResults: 50,
        playlistId,
        pageToken: nextPageToken,
      });

      const items = response.data.items;

      for (const item of items) {
        videos.push({
          title: item.snippet.title,
          videoId: item.contentDetails.videoId,
          publishedAt: item.contentDetails.videoPublishedAt,
        });
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
  } catch (err) {
    throw new Error(`Failed to fetch playlist items: ${err.message}`);
  }

  return videos;
}


async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Playlist URL is required as an argument.');
    process.exit(1);
  }

  const playlistUrl = args[0];
  const playlistId = extractPlaylistId(playlistUrl);

  if (!playlistId) {
    console.error('❌ Error: Invalid playlist URL.');
    process.exit(1);
  }

  try {
    const videos = await fetchAllVideos(playlistId);
    const sorted = videos.sort(
      (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)
    );

    console.log(`\n✅ Videos in upload order from playlist (${playlistId}):\n`);
    sorted.forEach((video, index) => {
      console.log(
        `${index + 1}. ${video.title} (Published: ${video.publishedAt}, Video ID: ${video.videoId})`
      );
    });
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
