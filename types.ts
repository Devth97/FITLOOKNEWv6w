export interface Profile {
  id: string;
  full_name: string | null;
  shop_name: string | null;
  role: 'admin' | 'shop';
  created_at: string;
}

export interface Garment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  size_options: string | null;
  image_url: string;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  created_at: string;
}

export interface TryonHistory {
  id: string;
  user_id: string;
  customer_id: string;
  garment_id: string | null;
  output_image_url: string;
  prompt_used: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  user_id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface GeneratedImageResponse {
  status: 'success' | 'error';
  output_image_url?: string;
  error?: string;
  customer_id?: string;
  garment_id?: string;
  prompt_used?: string;
  timestamp?: string;
}