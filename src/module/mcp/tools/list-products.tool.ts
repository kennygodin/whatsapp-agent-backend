import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ProductsService } from '../../products/products.service';
import { READ_ONLY, type AdminTool } from './admin-tool.interface';
import { LIST_PRODUCTS } from '../mcp.constants';

const inputSchema = z.object({});

@Injectable()
export class ListProductsTool implements AdminTool<typeof inputSchema> {
  readonly name = LIST_PRODUCTS.name;
  readonly title = LIST_PRODUCTS.title;
  readonly description = LIST_PRODUCTS.description;
  readonly inputSchema = inputSchema;
  readonly annotations = READ_ONLY;

  constructor(private readonly productsService: ProductsService) {}

  async execute() {
    return { products: await this.productsService.listWithStock() };
  }
}
