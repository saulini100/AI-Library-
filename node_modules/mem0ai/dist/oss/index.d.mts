import { z } from 'zod';
import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorStore as VectorStore$1 } from '@langchain/core/vectorstores';

interface MultiModalMessages {
    type: "image_url";
    image_url: {
        url: string;
    };
}
interface Message {
    role: string;
    content: string | MultiModalMessages;
}
interface EmbeddingConfig {
    apiKey?: string;
    model?: string | any;
    url?: string;
    modelProperties?: Record<string, any>;
}
interface VectorStoreConfig {
    collectionName?: string;
    dimension?: number;
    client?: any;
    instance?: any;
    [key: string]: any;
}
interface HistoryStoreConfig {
    provider: string;
    config: {
        historyDbPath?: string;
        supabaseUrl?: string;
        supabaseKey?: string;
        tableName?: string;
    };
}
interface LLMConfig {
    provider?: string;
    baseURL?: string;
    config?: Record<string, any>;
    apiKey?: string;
    model?: string | any;
    modelProperties?: Record<string, any>;
}
interface Neo4jConfig {
    url: string;
    username: string;
    password: string;
}
interface GraphStoreConfig {
    provider: string;
    config: Neo4jConfig;
    llm?: LLMConfig;
    customPrompt?: string;
}
interface MemoryConfig {
    version?: string;
    embedder: {
        provider: string;
        config: EmbeddingConfig;
    };
    vectorStore: {
        provider: string;
        config: VectorStoreConfig;
    };
    llm: {
        provider: string;
        config: LLMConfig;
    };
    historyStore?: HistoryStoreConfig;
    disableHistory?: boolean;
    historyDbPath?: string;
    customPrompt?: string;
    graphStore?: GraphStoreConfig;
    enableGraph?: boolean;
}
interface MemoryItem {
    id: string;
    memory: string;
    hash?: string;
    createdAt?: string;
    updatedAt?: string;
    score?: number;
    metadata?: Record<string, any>;
}
interface SearchFilters {
    userId?: string;
    agentId?: string;
    runId?: string;
    [key: string]: any;
}
interface SearchResult {
    results: MemoryItem[];
    relations?: any[];
}
interface VectorStoreResult {
    id: string;
    payload: Record<string, any>;
    score?: number;
}
declare const MemoryConfigSchema: z.ZodObject<{
    version: z.ZodOptional<z.ZodString>;
    embedder: z.ZodObject<{
        provider: z.ZodString;
        config: z.ZodObject<{
            modelProperties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            apiKey: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodAny]>>;
            baseURL: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        }, {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    }, {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    }>;
    vectorStore: z.ZodObject<{
        provider: z.ZodString;
        config: z.ZodObject<{
            collectionName: z.ZodOptional<z.ZodString>;
            dimension: z.ZodOptional<z.ZodNumber>;
            client: z.ZodOptional<z.ZodAny>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            collectionName: z.ZodOptional<z.ZodString>;
            dimension: z.ZodOptional<z.ZodNumber>;
            client: z.ZodOptional<z.ZodAny>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            collectionName: z.ZodOptional<z.ZodString>;
            dimension: z.ZodOptional<z.ZodNumber>;
            client: z.ZodOptional<z.ZodAny>;
        }, z.ZodTypeAny, "passthrough">>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        config: {
            collectionName?: string | undefined;
            dimension?: number | undefined;
            client?: any;
        } & {
            [k: string]: unknown;
        };
    }, {
        provider: string;
        config: {
            collectionName?: string | undefined;
            dimension?: number | undefined;
            client?: any;
        } & {
            [k: string]: unknown;
        };
    }>;
    llm: z.ZodObject<{
        provider: z.ZodString;
        config: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodAny]>>;
            modelProperties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            baseURL: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        }, {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    }, {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    }>;
    historyDbPath: z.ZodOptional<z.ZodString>;
    customPrompt: z.ZodOptional<z.ZodString>;
    enableGraph: z.ZodOptional<z.ZodBoolean>;
    graphStore: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        config: z.ZodObject<{
            url: z.ZodString;
            username: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            url: string;
            username: string;
            password: string;
        }, {
            url: string;
            username: string;
            password: string;
        }>;
        llm: z.ZodOptional<z.ZodObject<{
            provider: z.ZodString;
            config: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            provider: string;
            config: Record<string, any>;
        }, {
            provider: string;
            config: Record<string, any>;
        }>>;
        customPrompt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        config: {
            url: string;
            username: string;
            password: string;
        };
        llm?: {
            provider: string;
            config: Record<string, any>;
        } | undefined;
        customPrompt?: string | undefined;
    }, {
        provider: string;
        config: {
            url: string;
            username: string;
            password: string;
        };
        llm?: {
            provider: string;
            config: Record<string, any>;
        } | undefined;
        customPrompt?: string | undefined;
    }>>;
    historyStore: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        config: Record<string, any>;
    }, {
        provider: string;
        config: Record<string, any>;
    }>>;
    disableHistory: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    embedder: {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    };
    vectorStore: {
        provider: string;
        config: {
            collectionName?: string | undefined;
            dimension?: number | undefined;
            client?: any;
        } & {
            [k: string]: unknown;
        };
    };
    llm: {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    };
    version?: string | undefined;
    historyDbPath?: string | undefined;
    customPrompt?: string | undefined;
    enableGraph?: boolean | undefined;
    graphStore?: {
        provider: string;
        config: {
            url: string;
            username: string;
            password: string;
        };
        llm?: {
            provider: string;
            config: Record<string, any>;
        } | undefined;
        customPrompt?: string | undefined;
    } | undefined;
    historyStore?: {
        provider: string;
        config: Record<string, any>;
    } | undefined;
    disableHistory?: boolean | undefined;
}, {
    embedder: {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    };
    vectorStore: {
        provider: string;
        config: {
            collectionName?: string | undefined;
            dimension?: number | undefined;
            client?: any;
        } & {
            [k: string]: unknown;
        };
    };
    llm: {
        provider: string;
        config: {
            modelProperties?: Record<string, any> | undefined;
            apiKey?: string | undefined;
            model?: any;
            baseURL?: string | undefined;
        };
    };
    version?: string | undefined;
    historyDbPath?: string | undefined;
    customPrompt?: string | undefined;
    enableGraph?: boolean | undefined;
    graphStore?: {
        provider: string;
        config: {
            url: string;
            username: string;
            password: string;
        };
        llm?: {
            provider: string;
            config: Record<string, any>;
        } | undefined;
        customPrompt?: string | undefined;
    } | undefined;
    historyStore?: {
        provider: string;
        config: Record<string, any>;
    } | undefined;
    disableHistory?: boolean | undefined;
}>;

interface Entity {
    userId?: string;
    agentId?: string;
    runId?: string;
}
interface AddMemoryOptions extends Entity {
    metadata?: Record<string, any>;
    filters?: SearchFilters;
    infer?: boolean;
}
interface SearchMemoryOptions extends Entity {
    limit?: number;
    filters?: SearchFilters;
}
interface GetAllMemoryOptions extends Entity {
    limit?: number;
}
interface DeleteAllMemoryOptions extends Entity {
}

declare class Memory {
    private config;
    private customPrompt;
    private embedder;
    private vectorStore;
    private llm;
    private db;
    private collectionName;
    private apiVersion;
    private graphMemory?;
    private enableGraph;
    telemetryId: string;
    constructor(config?: Partial<MemoryConfig>);
    private _initializeTelemetry;
    private _getTelemetryId;
    private _captureEvent;
    static fromConfig(configDict: Record<string, any>): Memory;
    add(messages: string | Message[], config: AddMemoryOptions): Promise<SearchResult>;
    private addToVectorStore;
    get(memoryId: string): Promise<MemoryItem | null>;
    search(query: string, config: SearchMemoryOptions): Promise<SearchResult>;
    update(memoryId: string, data: string): Promise<{
        message: string;
    }>;
    delete(memoryId: string): Promise<{
        message: string;
    }>;
    deleteAll(config: DeleteAllMemoryOptions): Promise<{
        message: string;
    }>;
    history(memoryId: string): Promise<any[]>;
    reset(): Promise<void>;
    getAll(config: GetAllMemoryOptions): Promise<SearchResult>;
    private createMemory;
    private updateMemory;
    private deleteMemory;
}

interface Embedder {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}

declare class OpenAIEmbedder implements Embedder {
    private openai;
    private model;
    constructor(config: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}

declare class OllamaEmbedder implements Embedder {
    private ollama;
    private model;
    private initialized;
    constructor(config: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    private ensureModelExists;
}

declare class GoogleEmbedder implements Embedder {
    private google;
    private model;
    constructor(config: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}

declare class AzureOpenAIEmbedder implements Embedder {
    private client;
    private model;
    constructor(config: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}

declare class LangchainEmbedder implements Embedder {
    private embedderInstance;
    private batchSize?;
    constructor(config: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}

interface LLMResponse {
    content: string;
    role: string;
    toolCalls?: Array<{
        name: string;
        arguments: string;
    }>;
}
interface LLM {
    generateResponse(messages: Array<{
        role: string;
        content: string;
    }>, response_format?: {
        type: string;
    }, tools?: any[]): Promise<any>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class OpenAILLM implements LLM {
    private openai;
    private model;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    }, tools?: any[]): Promise<string | LLMResponse>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class GoogleLLM implements LLM {
    private google;
    private model;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    }, tools?: any[]): Promise<string | LLMResponse>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class OpenAIStructuredLLM implements LLM {
    private openai;
    private model;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    } | null, tools?: any[]): Promise<string | LLMResponse>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class AnthropicLLM implements LLM {
    private client;
    private model;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    }): Promise<string>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class GroqLLM implements LLM {
    private client;
    private model;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    }): Promise<string>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class OllamaLLM implements LLM {
    private ollama;
    private model;
    private initialized;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    }, tools?: any[]): Promise<string | LLMResponse>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
    private ensureModelExists;
}

declare class MistralLLM implements LLM {
    private client;
    private model;
    constructor(config: LLMConfig);
    private contentToString;
    generateResponse(messages: Message[], responseFormat?: {
        type: string;
    }, tools?: any[]): Promise<string | LLMResponse>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

declare class LangchainLLM implements LLM {
    private llmInstance;
    private modelName;
    constructor(config: LLMConfig);
    generateResponse(messages: Message[], response_format?: {
        type: string;
    }, tools?: any[]): Promise<string | LLMResponse>;
    generateChat(messages: Message[]): Promise<LLMResponse>;
}

interface VectorStore {
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    deleteCol(): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
    initialize(): Promise<void>;
}

declare class MemoryVectorStore implements VectorStore {
    private db;
    private dimension;
    private dbPath;
    constructor(config: VectorStoreConfig);
    private init;
    private run;
    private all;
    private getOne;
    private cosineSimilarity;
    private filterVector;
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    deleteCol(): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
    initialize(): Promise<void>;
}

interface QdrantConfig extends VectorStoreConfig {
    client?: QdrantClient;
    host?: string;
    port?: number;
    path?: string;
    url?: string;
    apiKey?: string;
    onDisk?: boolean;
    collectionName: string;
    embeddingModelDims: number;
    dimension?: number;
}
declare class Qdrant implements VectorStore {
    private client;
    private readonly collectionName;
    private dimension;
    constructor(config: QdrantConfig);
    private createFilter;
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    deleteCol(): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    private generateUUID;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
    initialize(): Promise<void>;
}

interface RedisConfig extends VectorStoreConfig {
    redisUrl: string;
    collectionName: string;
    embeddingModelDims: number;
    username?: string;
    password?: string;
}
declare class RedisDB implements VectorStore {
    private client;
    private readonly indexName;
    private readonly indexPrefix;
    private readonly schema;
    constructor(config: RedisConfig);
    private createIndex;
    initialize(): Promise<void>;
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    deleteCol(): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    close(): Promise<void>;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
}

interface SupabaseConfig extends VectorStoreConfig {
    supabaseUrl: string;
    supabaseKey: string;
    tableName: string;
    embeddingColumnName?: string;
    metadataColumnName?: string;
}
declare class SupabaseDB implements VectorStore {
    private client;
    private readonly tableName;
    private readonly embeddingColumnName;
    private readonly metadataColumnName;
    constructor(config: SupabaseConfig);
    initialize(): Promise<void>;
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    deleteCol(): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
}

interface LangchainStoreConfig extends VectorStoreConfig {
    client: VectorStore$1;
}
declare class LangchainVectorStore implements VectorStore {
    private lcStore;
    private dimension?;
    private storeUserId;
    constructor(config: LangchainStoreConfig);
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    deleteCol(): Promise<void>;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
    initialize(): Promise<void>;
}

interface VectorizeConfig extends VectorStoreConfig {
    apiKey?: string;
    indexName: string;
    accountId: string;
}
declare class VectorizeDB implements VectorStore {
    private client;
    private dimensions;
    private indexName;
    private accountId;
    constructor(config: VectorizeConfig);
    insert(vectors: number[][], ids: string[], payloads: Record<string, any>[]): Promise<void>;
    search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;
    get(vectorId: string): Promise<VectorStoreResult | null>;
    update(vectorId: string, vector: number[], payload: Record<string, any>): Promise<void>;
    delete(vectorId: string): Promise<void>;
    deleteCol(): Promise<void>;
    list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;
    private generateUUID;
    getUserId(): Promise<string>;
    setUserId(userId: string): Promise<void>;
    initialize(): Promise<void>;
}

interface HistoryManager {
    addHistory(memoryId: string, previousValue: string | null, newValue: string | null, action: string, createdAt?: string, updatedAt?: string, isDeleted?: number): Promise<void>;
    getHistory(memoryId: string): Promise<any[]>;
    reset(): Promise<void>;
    close(): void;
}

declare class EmbedderFactory {
    static create(provider: string, config: EmbeddingConfig): Embedder;
}
declare class LLMFactory {
    static create(provider: string, config: LLMConfig): LLM;
}
declare class VectorStoreFactory {
    static create(provider: string, config: VectorStoreConfig): VectorStore;
}
declare class HistoryManagerFactory {
    static create(provider: string, config: HistoryStoreConfig): HistoryManager;
}

export { type AddMemoryOptions, AnthropicLLM, AzureOpenAIEmbedder, type DeleteAllMemoryOptions, type Embedder, EmbedderFactory, type EmbeddingConfig, type Entity, type GetAllMemoryOptions, GoogleEmbedder, GoogleLLM, type GraphStoreConfig, GroqLLM, HistoryManagerFactory, type HistoryStoreConfig, type LLM, type LLMConfig, LLMFactory, type LLMResponse, LangchainEmbedder, LangchainLLM, LangchainVectorStore, Memory, type MemoryConfig, MemoryConfigSchema, type MemoryItem, MemoryVectorStore, type Message, MistralLLM, type MultiModalMessages, type Neo4jConfig, OllamaEmbedder, OllamaLLM, OpenAIEmbedder, OpenAILLM, OpenAIStructuredLLM, Qdrant, RedisDB, type SearchFilters, type SearchMemoryOptions, type SearchResult, SupabaseDB, type VectorStore, type VectorStoreConfig, VectorStoreFactory, type VectorStoreResult, VectorizeDB };
