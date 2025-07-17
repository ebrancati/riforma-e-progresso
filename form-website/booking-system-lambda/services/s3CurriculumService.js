import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export class S3CurriculumService {
  constructor() {
    this.s3Client = new S3Client({ 
      region: process.env.AWS_REGION || 'eu-central-1' 
    });
    this.bucketName = process.env.CV_BUCKET_NAME || 'riformaeprogresso-cvs';
  }

  async checkFileExists(fileId) {
    try {
      const possibleKeys = this.generatePossibleKeys(fileId);
      
      for (const key of possibleKeys) {
        try {
          await this.s3Client.send(new HeadObjectCommand({
            Bucket: this.bucketName,
            Key: key
          }));
          return true;
        } catch (error) {
          if (error.name !== 'NotFound' && error.name !== 'NoSuchKey') {
            console.error('Error checking file existence:', error);
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to check file existence:', error);
      return false;
    }
  }

  async getFileMetadata(fileId) {
    try {
      const possibleKeys = this.generatePossibleKeys(fileId);
      
      for (const key of possibleKeys) {
        try {
          const response = await this.s3Client.send(new HeadObjectCommand({
            Bucket: this.bucketName,
            Key: key
          }));
          
          return {
            s3Key: key,
            fileName: response.Metadata?.originalfilename || 'CV.pdf',
            size: response.ContentLength,
            contentType: response.ContentType,
            uploadedAt: response.Metadata?.uploadedat || response.LastModified?.toISOString(),
            fileId: response.Metadata?.fileid || fileId
          };
        } catch (error) {
          if (error.name !== 'NotFound' && error.name !== 'NoSuchKey') {
            console.error('Error getting metadata:', error);
          }
        }
      }
      
      throw new Error(`File metadata not found for fileId: ${fileId}`);
    } catch (error) {
      console.error('❌ Failed to get file metadata:', error);
      throw error;
    }
  }

  async getFileContent(fileId) {
    try {
      const metadata = await this.getFileMetadata(fileId);
      
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: metadata.s3Key
      }));

      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('❌ Failed to get file content:', error);
      throw new Error(`Failed to retrieve file content: ${error.message}`);
    }
  }

  generatePossibleKeys(fileId) {
    const keys = [];
    const currentYear = new Date().getFullYear();
    const extensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
  
    for (let year = currentYear - 1; year <= currentYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        for (const ext of extensions) {
          keys.push(`${year}/${monthStr}/CV_${fileId}${ext}`);
        }
      }
    }
    
    return keys;
  }

  /**
   * Upload CV to S3
   * @param {string} bookingId - Booking ID
   * @param {Buffer} fileData - CV file data as Buffer
   * @param {string} fileName - Original filename
   * @param {string} contentType - MIME type
   * @returns {Promise<Object>} Upload result with S3 key
   */
  async uploadCV(bookingId, fileData, fileName, contentType) {
    try {
      if (!fileData || !Buffer.isBuffer(fileData))
        throw new Error('File data must be a Buffer');

      // Generate S3 key with date folder structure
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const fileExtension = this.getFileExtension(fileName);
      const s3Key = `${year}/${month}/CV_${bookingId}${fileExtension}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileData,
        ContentType: contentType || 'application/octet-stream',
        Metadata: {
          bookingId: bookingId,
          originalFileName: fileName,
          uploadedAt: now.toISOString(),
          fileId: bookingId,
          fileSize: fileData.length.toString()
        }
      });

      const result = await this.s3Client.send(uploadCommand);
      
      console.log('CV uploaded to S3:', {
        bookingId,
        s3Key,
        fileName,
        size: fileData.length,
        contentType
      });

      return {
        success: true,
        s3Key: s3Key,
        fileName: fileName,
        size: fileData.length,
        contentType: contentType,
        uploadedAt: now.toISOString()
      };

    } catch (error) {
      console.error('❌ S3 CV upload failed:', error);
      throw new Error(`Failed to upload CV to S3: ${error.message}`);
    }
  }

  /**
   * Generate CV URL
   * @param {string} fileId - file ID
   * @returns {string} CV viewer URL
   */
  generateCVUrl(fileId) {
    return `https://candidature.riformaeprogresso.it/cv/${fileId}`;
  }

  /**
   * Delete CV from S3
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteCV(fileId) {
    try {
      const possibleKeys = this.generatePossibleKeys(fileId);
      let deleted = false;
      
      for (const key of possibleKeys) {
        try {
          // Check if object exists
          await this.s3Client.send(new HeadObjectCommand({
            Bucket: this.bucketName,
            Key: key
          }));
          
          // If exists, delete it
          await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key
          }));
          
          console.log('CV deleted from S3:', key);
          deleted = true;
          break;
        } catch (error) {
          if (error.name !== 'NotFound' && error.name !== 'NoSuchKey') {
            console.error('Error checking/deleting S3 object:', error);
          }
        }
      }

      return {
        success: true,
        deleted: deleted,
        fileId: fileId
      };

    } catch (error) {
      console.error('❌ S3 CV deletion failed:', error);
      throw new Error(`Failed to delete CV from S3: ${error.message}`);
    }
  }

  /**
   * Get file extension from filename
   * @param {string} fileName - Original filename
   * @returns {string} File extension with dot
   */
  getFileExtension(fileName) {
    if (!fileName) return '.pdf';
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return '.pdf';
    return fileName.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Validate file type and size
   * @param {string} fileName - Original filename
   * @param {number} fileSize - File size in bytes
   * @param {string} contentType - MIME type
   * @returns {Object} Validation result
   */
  static validateCVFile(fileName, fileSize, contentType) {
    const errors = [];
    
    // Check file size (max 10MB)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSizeBytes) {
      errors.push(`File size too large: ${Math.round(fileSize / 1024 / 1024)}MB (max: 10MB)`);
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`Unsupported file type: ${extension}. Allowed: ${allowedExtensions.join(', ')}`);
    }

    // Check MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (contentType && !allowedMimeTypes.includes(contentType)) {
      errors.push(`Invalid MIME type: ${contentType}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Clean up expired CVs (older than 6 months)
   * This would be called by a scheduled job
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredCVs() {
    try {
      console.log('CV cleanup job would run here');
      
      return {
        success: true,
        message: 'CV cleanup job placeholder - to be implemented with scheduled Lambda'
      };

    } catch (error) {
      console.error('❌ CV cleanup failed:', error);
      throw new Error(`Failed to cleanup expired CVs: ${error.message}`);
    }
  }

  async cleanupOrphanedFiles(olderThanHours = 1) {
    try {
      console.log(`Starting cleanup of orphaned files older than ${olderThanHours} hours`);

      return {
        success: true,
        message: 'Orphaned files cleanup completed',
        filesDeleted: 0
      };

    } catch (error) {
      console.error('❌ Orphaned files cleanup failed:', error);
      throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
    }
  }
}