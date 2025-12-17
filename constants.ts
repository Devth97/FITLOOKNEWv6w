export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const DEFAULT_AI_PROMPT = `You are an AI professional virtual try-on engine used in a boutique tailoring system. 
Your job is to generate a hyper-realistic try-on image combining a customer photo and a garment photo.

STRICT RULES FOR OUTPUT (DO NOT VIOLATE):

1. CUSTOMER MUST REMAIN 100% IDENTICAL:
   - Same face structure, eyes, nose, lips, skin tone, hair, and posture.
   - Do NOT modify the customer's identity.
   - Do NOT beautify, stylize, or change the customer.
   - Maintain exact pose, angle, proportions, and body shape.

2. GARMENT MUST REMAIN 100% TRUE TO ORIGINAL:
   - Preserve exact colors, textures, embroidery, stitching patterns, borders, shine, and fabric details.
   - Do NOT simplify or invent new patterns.
   - Do NOT change the garment shape or design.
   - The garment must fit naturally onto the customer's body and align to their posture.

3. FITTING & REALISM REQUIREMENTS:
   - Align garment edges accurately around shoulders, arms, waist, and body contours.
   - Remove the original clothing underneath cleanly.
   - Maintain correct perspective, light, and shadow.
   - Avoid warping, stretching, or distorting the garment.
   - Ensure clean blending at neck, sleeves, and borders.

4. BACKGROUND RULE:
   - Generate a clean, neutral studio-style background.
   - No distractions, props, artifacts, or unnecessary objects.

5. OUTPUT STYLE:
   - Photo-realistic.
   - High-resolution.
   - Natural colors.
   - No filters, no stylization.

6. FINAL OUTPUT REQUIREMENT:
   Produce a seamless, realistic, studio-quality try-on image where:
   - The customer looks exactly like themselves.
   - The garment looks exactly like the provided garment.
   - Both appear naturally merged as if photographed together.

Always ensure accuracy, realism, and garment integrity.
Return ONLY the perfected try-on image as the output.`;

export const TRYON_MODES = {
   normal: {
      id: 'normal',
      label: 'Normal Mode (Fast)',
      model: 'gemini-2.5-flash-image',
      prompt: "Generate a virtual try-on image. The first image is the CUSTOMER - keep their face, body, and pose exactly the same. The second image is the GARMENT they should wear. Create a new image showing THIS EXACT CUSTOMER wearing THIS EXACT GARMENT. The customer must be recognizable as the same person. The garment must look identical to the one provided (same colors, patterns, details). Fit the garment naturally on the customer's body. Use a clean studio background."
   },
   pro: {
      id: 'pro',
      label: 'Pro Mode (High Quality)',
      model: 'gemini-3-pro-image-preview',
      prompt: "You are a professional virtual try-on system. I am providing two images: IMAGE 1 is the CUSTOMER photo - this person must appear in the final output with their exact same face, skin tone, hair, and body proportions preserved perfectly. IMAGE 2 is the GARMENT - this exact garment with all its colors, textures, embroidery, and design details must appear on the customer. Generate a single photorealistic image showing the customer from IMAGE 1 wearing the garment from IMAGE 2. The garment should fit naturally on their body with proper draping, shadows, and alignment. Use a clean neutral studio background. The final image must look like a real photograph of this specific person wearing this specific garment."
   }
};

export const GARMENT_CATEGORIES = [
   'Sherwani',
   'Jodhpuri (Bandhgala)',
   'Suit',
   'Tuxedo',
   'Indo-Western',
   'Kurta Set',
   'Achkan',
   'Bandhgala'
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'];