export type ToolScope = 'core' | 'optional' | 'rare';

export interface MCPServerSettings {
    port: number;
    autoStart: boolean;
    enableDebugLog: boolean;
    allowedOrigins: string[];
    maxConnections: number;
    // Token-budget control: scopes listed here are skipped during setupTools().
    // Empty array (default) = backward-compatible full load.
    // Recommended: ["rare"] to disable low-frequency categories (see MCP_AUDIT_REPORT.md §5).
    disabledScopes?: ToolScope[];
}

export interface ServerStatus {
    running: boolean;
    port: number;
    clients: number;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    // Optional per-tool scope override. If unset, the category default
    // (CATEGORY_SCOPES in mcp-server.ts) applies.
    scope?: ToolScope;
}

// Structured error companion for ToolResponse. Free-form keys allowed for site-specific context.
export interface ErrorDetails {
    suggestion?: string;            // hint shown to human/AI
    relatedAssets?: string[];       // db:// URLs that may be relevant
    editorLogRef?: string;          // pointer into editor log
    [key: string]: any;
}

export interface ToolResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;                 // human-readable error (kept for backward compat)
    errorCode?: string;             // machine-readable code (UPPER_SNAKE_CASE; see ERROR_CODES in utils/error-response.ts)
    details?: ErrorDetails;
    instruction?: string;
    warning?: string;
    verificationData?: any;
    updatedProperties?: string[];
}

export interface NodeInfo {
    uuid: string;
    name: string;
    active: boolean;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    parent?: string;
    children?: string[];
    components?: ComponentInfo[];
    layer?: number;
    mobility?: number;
}

export interface ComponentInfo {
    type: string;
    enabled: boolean;
    properties?: Record<string, any>;
}

export interface SceneInfo {
    name: string;
    uuid: string;
    path: string;
}

export interface PrefabInfo {
    name: string;
    uuid: string;
    path: string;
    folder: string;
    createTime?: string;
    modifyTime?: string;
    dependencies?: string[];
}

export interface AssetInfo {
    name: string;
    uuid: string;
    path: string;
    type: string;
    size?: number;
    isDirectory: boolean;
    meta?: {
        ver: string;
        importer: string;
    };
}

export interface ProjectInfo {
    name: string;
    path: string;
    uuid: string;
    version: string;
    cocosVersion: string;
}

export interface ConsoleMessage {
    timestamp: string;
    type: 'log' | 'warn' | 'error' | 'info';
    message: string;
    stack?: string;
}

export interface PerformanceStats {
    nodeCount: number;
    componentCount: number;
    drawCalls: number;
    triangles: number;
    memory: Record<string, any>;
}

export interface ValidationIssue {
    type: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    details?: any;
    suggestion?: string;
}

export interface ValidationResult {
    valid: boolean;
    issueCount: number;
    issues: ValidationIssue[];
}

export interface MCPClient {
    id: string;
    lastActivity: Date;
    userAgent?: string;
}

export interface ToolExecutor {
    getTools(): ToolDefinition[];
    execute(toolName: string, args: any): Promise<ToolResponse>;
}

// 工具配置管理相关接口
export interface ToolConfig {
    category: string;
    name: string;
    enabled: boolean;
    description: string;
}

export interface ToolConfiguration {
    id: string;
    name: string;
    description?: string;
    tools: ToolConfig[];
    createdAt: string;
    updatedAt: string;
}

export interface ToolManagerSettings {
    configurations: ToolConfiguration[];
    currentConfigId: string;
    maxConfigSlots: number;
}

export interface ToolManagerState {
    availableTools: ToolConfig[];
    currentConfiguration: ToolConfiguration | null;
    configurations: ToolConfiguration[];
}