const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class YouTubeUploader {
  constructor() {
    this.credentialsPath = path.join(__dirname, 'credentials.json');
    this.tokenPath = path.join(__dirname, 'token.json');
  }

  async getAuth() {
    let credentials, token;

    // Try reading from environment variables first
    if (process.env.YT_CREDENTIALS && process.env.YT_TOKEN) {
      credentials = JSON.parse(process.env.YT_CREDENTIALS);
      token = JSON.parse(process.env.YT_TOKEN);
    } 
    // Fallback to local files
    else if (fs.existsSync(this.credentialsPath) && fs.existsSync(this.tokenPath)) {
      credentials = JSON.parse(fs.readFileSync(this.credentialsPath));
      token = JSON.parse(fs.readFileSync(this.tokenPath));
    } else {
      throw new Error('Missing YouTube credentials or token (neither in ENV nor in files).');
    }

    const { client_secret, client_id, redirect_uris } = credentials.web;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(token);
    return auth;
  }

  async upload(videoPath, metadata) {
    console.log(`[Uploader] Starting upload for: ${metadata.title}`);
    
    const auth = await this.getAuth();
    const youtube = google.youtube({ version: 'v3', auth });

    const res = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: '27', // Education
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    console.log(`[Uploader] Upload successful! Video ID: ${res.data.id}`);
    return res.data;
  }

  async addToPlaylist(videoId, playlistId) {
    if (!playlistId) return;
    console.log(`[Uploader] Adding video ${videoId} to playlist ${playlistId}`);
    try {
      const auth = await this.getAuth();
      const youtube = google.youtube({ version: 'v3', auth });
      await youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });
      console.log(`[Uploader] Successfully added to playlist!`);
    } catch (err) {
      console.error(`[Uploader] Failed to add to playlist: ${err.message}`);
    }
  }

  async postComment(videoId, commentText) {
    console.log(`[Uploader] Posting comment to video: ${videoId}`);
    
    try {
      const auth = await this.getAuth();
      const youtube = google.youtube({ version: 'v3', auth });

      await youtube.commentThreads.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            videoId: videoId,
            topLevelComment: {
              snippet: {
                textOriginal: commentText
              }
            }
          }
        }
      });
      console.log(`[Uploader] Comment posted successfully!`);
    } catch (err) {
      console.error(`[Uploader] Failed to post comment: ${err.message}`);
    }
  }
}

module.exports = YouTubeUploader;
