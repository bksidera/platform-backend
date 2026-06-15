import { Injectable } from '@nestjs/common';

@Injectable()
export class CommonService {
  async getExtensionFromAllMimeType(
    mimeType: string,
  ): Promise<{ extension: string; type: string }> {
    const mimeTypes = new Map([
      // Video
      ['video/mp4', { extension: 'mp4', type: 'video' }],
      ['video/quicktime', { extension: 'mov', type: 'video' }],
      ['video/webm', { extension: 'webm', type: 'video' }],
      // Image
      ['image/jpeg', { extension: 'jpg', type: 'image' }],
      ['image/png', { extension: 'png', type: 'image' }],
      ['image/gif', { extension: 'gif', type: 'image' }],
      ['image/webp', { extension: 'webp', type: 'image' }],
      ['image/heic', { extension: 'heic', type: 'image' }],
      ['image/heif', { extension: 'heif', type: 'image' }],
    ]);
    return mimeTypes.get(mimeType) ?? { extension: '', type: '' };
  }

  // Same mapping, kept under the name and string shape the chunked-upload path historically used.
  async getExtensionFromMimeType(mimeType: string): Promise<string> {
    const { extension } = await this.getExtensionFromAllMimeType(mimeType);
    return extension || 'unknown';
  }

  async extractFilename(url: string): Promise<string> {
    return url.split('/').pop() ?? url;
  }
}
