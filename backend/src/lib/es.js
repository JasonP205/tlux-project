import { Client } from "@elastic/elasticsearch";

const INDEX = "products";
let client = null;

export function getES() {
  if (!client) {
    client = new Client({ node: process.env.ELASTICSEARCH_URL || "http://localhost:9200" });
  }
  return client;
}

// Analyzer asciifolding để "sua tuoi" khớp "sữa tươi"
export async function ensureProductIndex() {
  const es = getES();
  const exists = await es.indices.exists({ index: INDEX });
  if (exists) return;
  await es.indices.create({
    index: INDEX,
    settings: {
      analysis: {
        analyzer: {
          vi_folded: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding"],
          },
        },
      },
    },
    mappings: {
      properties: {
        name: { type: "text", analyzer: "vi_folded", search_analyzer: "vi_folded" },
        barcode: { type: "keyword" },
        price: { type: "double" },
        unit: { type: "keyword" },
        categoryId: { type: "keyword" },
        categoryName: { type: "keyword" },
        imageUrl: { type: "keyword", index: false },
        active: { type: "boolean" },
      },
    },
  });
}

export async function indexProduct(product) {
  const es = getES();
  await es.index({
    index: INDEX,
    id: product._id.toString(),
    document: {
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      unit: product.unit,
      categoryId: product.category?._id?.toString() || product.category?.toString() || null,
      categoryName: product.category?.name || null,
      imageUrl: product.image?.url || null,
      active: product.active,
    },
    refresh: "wait_for",
  });
}

export async function removeProduct(productId) {
  const es = getES();
  await es.delete({ index: INDEX, id: productId.toString() }).catch((err) => {
    if (err?.meta?.statusCode !== 404) throw err;
  });
}

export async function searchProducts(q, { limit = 20 } = {}) {
  const es = getES();
  const result = await es.search({
    index: INDEX,
    size: limit,
    query: {
      bool: {
        must: {
          multi_match: {
            query: q,
            fields: ["name^3", "barcode"],
            fuzziness: "AUTO",
            prefix_length: 1,
          },
        },
        filter: [{ term: { active: true } }],
      },
    },
  });
  return result.hits.hits.map((hit) => ({ id: hit._id, score: hit._score, ...hit._source }));
}
