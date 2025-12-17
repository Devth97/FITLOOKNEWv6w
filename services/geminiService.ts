import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { TRYON_MODES } from '../constants';

// Initialize the API client
// Note: We are using a factory function to ensure we get fresh keys if needed, 
// though typically env var is static.
const getAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set. Please add your Gemini API key.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateTryOn = async (
    customerImageUrl: string,
    garmentImageUrl: string,
    systemInstruction: string,
    mode: 'normal' | 'pro' = 'normal'
): Promise<{ base64: string; mimeType: string }> => {
    try {
        const ai = getAIClient();
        const modeConfig = TRYON_MODES[mode];

        // Fetch images and convert to base64 with correct MIME types
        const [customerImage, garmentImage] = await Promise.all([
            urlToBase64WithMime(customerImageUrl),
            urlToBase64WithMime(garmentImageUrl)
        ]);

        // Clear prompt with explicit image labels
        const combinedPrompt = `You are a virtual try-on AI. Your task is to generate a NEW composite image.

${modeConfig.prompt}

CRITICAL INSTRUCTIONS:
1. IMAGE 1 (first image) = THE PERSON/CUSTOMER - This is who should appear in the output
2. IMAGE 2 (second image) = THE CLOTHING/GARMENT - This is what they should be wearing

YOUR OUTPUT MUST:
- Show the EXACT same person from Image 1 (same face, skin, hair, body)
- Dress them in the EXACT garment from Image 2 (same colors, patterns, fabric)
- Create a realistic composite where the person is wearing the garment
- Use a clean neutral background

DO NOT just return the original person image. You MUST show them wearing the new garment.

${systemInstruction}

[PERSON IMAGE FOLLOWS]`;

        const response = await ai.models.generateContent({
            model: modeConfig.model,
            contents: {
                parts: [
                    {
                        text: combinedPrompt
                    },
                    {
                        inlineData: {
                            data: customerImage.base64,
                            mimeType: customerImage.mimeType
                        }
                    },
                    {
                        text: "[GARMENT/CLOTHING IMAGE FOLLOWS - DRESS THE PERSON IN THIS]"
                    },
                    {
                        inlineData: {
                            data: garmentImage.base64,
                            mimeType: garmentImage.mimeType
                        }
                    }
                ]
            },
            config: {
                responseModalities: ["image", "text"],
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            }
        });

        // Extract image from response
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        base64: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'image/jpeg'
                    };
                }
            }
        }

        // If no image, throw with more detail
        const textResponse = candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
        throw new Error(`No image generated. Model response: ${textResponse.substring(0, 100)}`);

    } catch (error: any) {
        console.error("Gemini Try-On Error:", error);
        throw new Error(error.message || 'Failed to generate try-on image');
    }
};

export const editImage = async (
    sourceImageUrl: string,
    prompt: string
): Promise<{ base64: string; mimeType: string }> => {
    try {
        const ai = getAIClient();

        // Fetch source image with correct MIME type
        const sourceImage = await urlToBase64WithMime(sourceImageUrl);

        // Using Gemini 2.5 Flash Image as requested for editing functionality
        const model = 'gemini-2.5-flash-image';

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: sourceImage.base64,
                            mimeType: sourceImage.mimeType
                        }
                    },
                    {
                        text: prompt // e.g. "Add a retro filter"
                    }
                ]
            }
        });

        // Extract image from response
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        base64: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'image/jpeg'
                    };
                }
            }
        }

        throw new Error("No image generated in the response");

    } catch (error) {
        console.error("Gemini Edit Error:", error);
        throw error;
    }
}

// Helper to fetch an image URL and return base64 string with correct MIME type
async function urlToBase64WithMime(url: string): Promise<{ base64: string; mimeType: string }> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Get the actual MIME type from the blob
        const mimeType = blob.type || 'image/jpeg';
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64Data = base64String.split(',')[1];
                resolve({ base64: base64Data, mimeType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        throw new Error('Failed to load image for processing');
    }
}