// slider.model.ts
import { formatDate } from '@angular/common';

export class Slider {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_url: string;
  sort_order: number;
  is_active: boolean;
  background_color: string;
  text_color: string;
  display_on: string; // 'all' | 'desktop' | 'mobile'
  created_at: string;
  updated_at: string;

  constructor(slider: Partial<Slider> = {}) {
    this.id = slider.id || '';
    this.title = slider.title || '';
    this.subtitle = slider.subtitle || '';
    this.description = slider.description || '';
    this.image = slider.image || '';
    this.button_text = slider.button_text || '';
    this.button_url = slider.button_url || '';
    this.sort_order = slider.sort_order || 0;
    this.is_active = slider.is_active !== undefined ? slider.is_active : true;
    this.background_color = slider.background_color || '';
    this.text_color = slider.text_color || '';
    this.display_on = slider.display_on || (slider as any).screen_type || 'all';
    this.created_at = slider.created_at || '';
    this.updated_at = slider.updated_at || '';
  }

  public getRandomID(): string {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000).toString(16);
    };
    return S4() + S4();
  }
}
