export interface AvatarFileResult {
  path: string;
  mimeType: string;
  /** Validator for conditional requests; changes with every upload. */
  etag: string;
}
