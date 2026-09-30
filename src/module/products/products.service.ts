import { Injectable } from '@nestjs/common';
import { formatNaira } from '../../common/utils/money.util'
import { ProductsRepository } from './products.repository';
import {
  MAX_SEARCH_RESULTS,
  MAX_SEARCH_TERMS,
  MIN_SEARCH_TERM_LENGTH,
  SEARCH_STOPWORDS,
} from './products.constants';

export interface CatalogItem {
  productId: string;
  name: string;
  description: string;
  price: string;
  inStock: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async search(query: string): Promise<CatalogItem[]> {
    const terms = this.toSearchTerms(query);
    if (terms.length === 0) {
      return [];
    }

    const products = await this.productsRepository.searchActive(
      terms,
      MAX_SEARCH_RESULTS,
    );
    return products.map((product) => ({
      productId: product.id,
      name: product.name,
      description: product.description,
      price: formatNaira(product.price),
      inStock: product.stock > 0,
    }));
  }

  private toSearchTerms(query: string): string[] {
    const words = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(
        (word) =>
          word.length >= MIN_SEARCH_TERM_LENGTH && !SEARCH_STOPWORDS.has(word),
      )
      .map((word) =>
        word.length > MIN_SEARCH_TERM_LENGTH && word.endsWith('s')
          ? word.slice(0, -1)
          : word,
      );
    return [...new Set(words)].slice(0, MAX_SEARCH_TERMS);
  }
}
