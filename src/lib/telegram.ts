const BOT_TOKEN = '7093786320:AAFJ3VHetpwL8SVzEsSn_ICswN42eetfGUc';
const CHAT_ID = '-1003892775304';

console.log('[Telegram] Library initialized with hardcoded token. Version: 2.2');

export function uploadToTelegram(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('photo', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 404) {
        reject(new Error('Telegram API returned 404. Please check if your Bot Token is correct.'));
        return;
      }

      try {
        const data = JSON.parse(xhr.responseText);
        if (!data.ok) {
          reject(new Error(data.description || 'Failed to upload to Telegram'));
          return;
        }

        const photo = data.result.photo;
        resolve(photo[photo.length - 1].file_id);
      } catch (e) {
        reject(new Error('Failed to parse Telegram response'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during Telegram upload'));
    xhr.send(formData);
  });
}

export async function getTelegramImageUrl(fileId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[Telegram] Fetching file path for fileId: ${fileId} using XMLHttpRequest`);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    
    // Add headers to prevent caching
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.setRequestHeader('Pragma', 'no-cache');

    xhr.onload = () => {
      if (xhr.status === 404) {
        console.error('[Telegram] 404 error: Bot token might be invalid.');
        reject(new Error('Telegram API returned 404. Please check if your Bot Token is correct.'));
        return;
      }

      try {
        const data = JSON.parse(xhr.responseText);
        if (!data.ok) {
          console.error('[Telegram] Error getting file path:', data.description);
          reject(new Error(data.description || 'Failed to get file path from Telegram'));
          return;
        }

        const filePath = data.result.file_path;
        // Add a cache-busting timestamp to the final image URL
        const finalUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}?t=${Date.now()}`;
        console.log(`[Telegram] Successfully generated URL for ${fileId}`);
        resolve(finalUrl);
      } catch (e) {
        console.error('[Telegram] Failed to parse Telegram response:', e);
        reject(new Error('Failed to parse Telegram response'));
      }
    };

    xhr.onerror = () => {
      console.error('[Telegram] Network error during getFile');
      reject(new Error('Network error during Telegram getFile'));
    };
    
    xhr.send();
  });
}
