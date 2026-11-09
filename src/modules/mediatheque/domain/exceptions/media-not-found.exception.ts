export class MediaNotFoundException extends Error {
  constructor(message = 'Media not found') {
    super(message);
    this.name = 'MediaNotFoundException';
  }
}
