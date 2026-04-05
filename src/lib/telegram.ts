const BOT_TOKEN = '7093786320:AAFJ3VHetpwL8SVzEsSn_ICswN42eetfGUc';
const CHAT_ID = '-1003892775304';

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
  try {
    // Add cache: 'no-store' to prevent the browser from caching the expired file_path
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.status === 404) {
      throw new Error('Telegram API returned 404. Please check if your Bot Token is correct.');
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Failed to get file path from Telegram');
    }

    const filePath = data.result.file_path;
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('An unknown error occurred while fetching Telegram image');
  }
}
