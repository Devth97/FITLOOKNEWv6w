import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Storage Helper
export const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `fitlook/${folder}/${fileName}`;
    const bucketName = 'public';

    // Attempt upload
    let { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    // If bucket not found, try to create it and retry
    // Check for various forms of "Not Found" error from Supabase
    const isBucketNotFound = uploadError && (
      uploadError.message.includes('Bucket not found') ||
      (uploadError as any).statusCode === '404' ||
      (uploadError as any).statusCode === 404 ||
      (uploadError as any).error === 'Bucket not found'
    );

    if (isBucketNotFound) {
      console.log(`Bucket '${bucketName}' not found. Attempting to create...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      });

      if (createError) {
        console.warn("Failed to create bucket (it might already exist or permissions are insufficient). Attempting upload retry...", createError);
      }

      // Retry upload
      const { error: retryError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      uploadError = retryError;
    }

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return null;
  }
};

// Base64 to Blob helper for saving AI generated images
export const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const saveGeneratedImage = async (base64Data: string, customerId: string): Promise<string | null> => {
  // Remove data:image/jpeg;base64, prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const blob = base64ToBlob(cleanBase64, 'image/jpeg');
  const file = new File([blob], "generated.jpg", { type: "image/jpeg" });

  return await uploadImage(file, 'tryons');
};