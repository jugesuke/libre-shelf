export interface NewItem {
  product_name: string;
  publisher_name: string;
  class: string;
  type: string;
  genre_code?: string | undefined | null;
  price?: number | undefined | null;
  sample_image_url?: string | undefined | null;
}

export interface Item extends NewItem {
  item_id: string;
}
