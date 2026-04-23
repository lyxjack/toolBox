"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DebugTools {
    constructor() {
        this.consoleMessages = [];
        this.maxMessages = 1000;
        this.setupConsoleCapture();
    }
    setupConsoleCapture() {
        // Intercept Editor console messages
        // Note: Editor.Message.addBroadcastListener may not be available in all versions
        // This is a placeholder for console capture implementation
        console.log('Console capture setup - implementation depends on Editor API availability');
    }
    addConsoleMessage(message) {
        this.consoleMessages.push(Object.assign({ timestamp: new Date().toISOString() }, message));
        // Keep only latest messages
        if (this.consoleMessages.length > this.maxMessages) {
            this.consoleMessages.shift();
        }
    }
    getTools() {
        return [
            // v1.6.0: get_console_logs + get_project_logs + search_project_logs
            // merged into `logs({action})` — see below.
            {
                name: 'clear_console',
                description: 'Clear editor console',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'execute_script',
                description: 'Execute JavaScript in scene context',
                inputSchema: {
                    type: 'object',
                    properties: {
                        script: {
                            type: 'string',
                            description: 'JavaScript code to execute'
                        }
                    },
                    required: ['script']
                }
            },
            {
                name: 'get_node_tree',
                description: 'Get detailed node tree for debugging',
                inputSchema: {
                    type: 'object',
                    properties: {
                        rootUuid: {
                            type: 'string',
                            description: 'Root node UUID (optional, uses scene root if not provided)'
                        },
                        maxDepth: {
                            type: 'number',
                            description: 'Maximum tree depth',
                            default: 10
                        }
                    }
                }
            },
            {
                name: 'get_performance_stats',
                description: 'Get performance statistics',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'validate_scene',
                description: 'Validate current scene for issues',
                inputSchema: {
                    type: 'object',
                    properties: {
                        checkMissingAssets: {
                            type: 'boolean',
                            description: 'Check for missing asset references',
                            default: true
                        },
                        checkPerformance: {
                            type: 'boolean',
                            description: 'Check for performance issues',
                            default: true
                        }
                    }
                }
            },
            {
                name: 'get_editor_info',
                description: 'Get editor and environment information',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_log_file_info',
                description: 'Get information about the project log file',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'logs',
                description: 'Unified log access (v1.6.0). action=console: editor console lines. action=project: read project.log tail. action=search: regex search across project.log. NOTE: return shape differs per action — console/project return log arrays, search returns match objects with location/context.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['console', 'project', 'search'],
                            description: 'Which log source / operation'
                        },
                        limit: { type: 'number', description: 'For console: recent N (default 100)', default: 100 },
                        filter: {
                            type: 'string',
                            enum: ['all', 'log', 'warn', 'error', 'info'],
                            description: 'For console: filter by log type',
                            default: 'all'
                        },
                        lines: { type: 'number', description: 'For project: tail N lines (default 100)', default: 100 },
                        filterKeyword: { type: 'string', description: 'For project: keyword filter' },
                        logLevel: {
                            type: 'string',
                            enum: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'ALL'],
                            description: 'For project: log level filter',
                            default: 'ALL'
                        },
                        pattern: { type: 'string', description: 'For search: regex pattern' },
                        maxResults: { type: 'number', description: 'For search: max matches (default 20)', default: 20 },
                        contextLines: { type: 'number', description: 'For search: context lines per match (default 2)', default: 2 }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'get_console_logs':
                return await this.getConsoleLogs(args.limit, args.filter);
            case 'clear_console':
                return await this.clearConsole();
            case 'execute_script':
                return await this.executeScript(args.script);
            case 'get_node_tree':
                return await this.getNodeTree(args.rootUuid, args.maxDepth);
            case 'get_performance_stats':
                return await this.getPerformanceStats();
            case 'validate_scene':
                return await this.validateScene(args);
            case 'get_editor_info':
                return await this.getEditorInfo();
            case 'get_project_logs':
                return await this.getProjectLogs(args.lines, args.filterKeyword, args.logLevel);
            case 'get_log_file_info':
                return await this.getLogFileInfo();
            case 'search_project_logs':
                return await this.searchProjectLogs(args.pattern, args.maxResults, args.contextLines);
            case 'logs':
                // v1.6.0 unified action-code dispatcher
                switch (args.action) {
                    case 'console':
                        return await this.getConsoleLogs(args.limit, args.filter);
                    case 'project':
                        return await this.getProjectLogs(args.lines, args.filterKeyword, args.logLevel);
                    case 'search':
                        return await this.searchProjectLogs(args.pattern, args.maxResults, args.contextLines);
                    default:
                        return {
                            success: false,
                            error: `Unknown logs action: ${args.action}`,
                            errorCode: 'INVALID_PARAMS'
                        };
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async getConsoleLogs(limit = 100, filter = 'all') {
        let logs = this.consoleMessages;
        if (filter !== 'all') {
            logs = logs.filter(log => log.type === filter);
        }
        const recentLogs = logs.slice(-limit);
        return {
            success: true,
            data: {
                total: logs.length,
                returned: recentLogs.length,
                logs: recentLogs
            }
        };
    }
    async clearConsole() {
        this.consoleMessages = [];
        try {
            // Note: Editor.Message.send may not return a promise in all versions
            Editor.Message.send('console', 'clear');
            return {
                success: true,
                message: 'Console cleared successfully'
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async executeScript(script) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'execute-scene-script', {
                name: 'console',
                method: 'eval',
                args: [script]
            }).then((result) => {
                resolve({
                    success: true,
                    data: {
                        result: result,
                        message: 'Script executed successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getNodeTree(rootUuid, maxDepth = 10) {
        return new Promise((resolve) => {
            const buildTree = async (nodeUuid, depth = 0) => {
                if (depth >= maxDepth) {
                    return { truncated: true };
                }
                try {
                    const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
                    const tree = {
                        uuid: nodeData.uuid,
                        name: nodeData.name,
                        active: nodeData.active,
                        components: nodeData.components ? nodeData.components.map((c) => c.__type__) : [],
                        childCount: nodeData.children ? nodeData.children.length : 0,
                        children: []
                    };
                    if (nodeData.children && nodeData.children.length > 0) {
                        for (const childId of nodeData.children) {
                            const childTree = await buildTree(childId, depth + 1);
                            tree.children.push(childTree);
                        }
                    }
                    return tree;
                }
                catch (err) {
                    return { error: err.message };
                }
            };
            if (rootUuid) {
                buildTree(rootUuid).then(tree => {
                    resolve({ success: true, data: tree });
                });
            }
            else {
                Editor.Message.request('scene', 'query-hierarchy').then(async (hierarchy) => {
                    const trees = [];
                    for (const rootNode of hierarchy.children) {
                        const tree = await buildTree(rootNode.uuid);
                        trees.push(tree);
                    }
                    resolve({ success: true, data: trees });
                }).catch((err) => {
                    resolve({ success: false, error: err.message });
                });
            }
        });
    }
    async getPerformanceStats() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-performance').then((stats) => {
                const perfStats = {
                    nodeCount: stats.nodeCount || 0,
                    componentCount: stats.componentCount || 0,
                    drawCalls: stats.drawCalls || 0,
                    triangles: stats.triangles || 0,
                    memory: stats.memory || {}
                };
                resolve({ success: true, data: perfStats });
            }).catch(() => {
                // Fallback to basic stats
                resolve({
                    success: true,
                    data: {
                        message: 'Performance stats not available in edit mode'
                    }
                });
            });
        });
    }
    async validateScene(options) {
        const issues = [];
        try {
            // Check for missing assets
            if (options.checkMissingAssets) {
                const assetCheck = await Editor.Message.request('scene', 'check-missing-assets');
                if (assetCheck && assetCheck.missing) {
                    issues.push({
                        type: 'error',
                        category: 'assets',
                        message: `Found ${assetCheck.missing.length} missing asset references`,
                        details: assetCheck.missing
                    });
                }
            }
            // Check for performance issues
            if (options.checkPerformance) {
                const hierarchy = await Editor.Message.request('scene', 'query-hierarchy');
                const nodeCount = this.countNodes(hierarchy.children);
                if (nodeCount > 1000) {
                    issues.push({
                        type: 'warning',
                        category: 'performance',
                        message: `High node count: ${nodeCount} nodes (recommended < 1000)`,
                        suggestion: 'Consider using object pooling or scene optimization'
                    });
                }
            }
            const result = {
                valid: issues.length === 0,
                issueCount: issues.length,
                issues: issues
            };
            return { success: true, data: result };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    countNodes(nodes) {
        let count = nodes.length;
        for (const node of nodes) {
            if (node.children) {
                count += this.countNodes(node.children);
            }
        }
        return count;
    }
    async getEditorInfo() {
        var _a, _b;
        const info = {
            editor: {
                version: ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.editor) || 'Unknown',
                cocosVersion: ((_b = Editor.versions) === null || _b === void 0 ? void 0 : _b.cocos) || 'Unknown',
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version
            },
            project: {
                name: Editor.Project.name,
                path: Editor.Project.path,
                uuid: Editor.Project.uuid
            },
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
        return { success: true, data: info };
    }
    async getProjectLogs(lines = 100, filterKeyword, logLevel = 'ALL') {
        try {
            // Try multiple possible project paths
            let logFilePath = '';
            const possiblePaths = [
                Editor.Project ? Editor.Project.path : null,
                '/Users/lizhiyong/NewProject_3',
                process.cwd(),
            ].filter(p => p !== null);
            for (const basePath of possiblePaths) {
                const testPath = path.join(basePath, 'temp/logs/project.log');
                if (fs.existsSync(testPath)) {
                    logFilePath = testPath;
                    break;
                }
            }
            if (!logFilePath) {
                return {
                    success: false,
                    error: `Project log file not found. Tried paths: ${possiblePaths.map(p => path.join(p, 'temp/logs/project.log')).join(', ')}`
                };
            }
            // Read the file content
            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const logLines = logContent.split('\n').filter(line => line.trim() !== '');
            // Get the last N lines
            const recentLines = logLines.slice(-lines);
            // Apply filters
            let filteredLines = recentLines;
            // Filter by log level if not 'ALL'
            if (logLevel !== 'ALL') {
                filteredLines = filteredLines.filter(line => line.includes(`[${logLevel}]`) || line.includes(logLevel.toLowerCase()));
            }
            // Filter by keyword if provided
            if (filterKeyword) {
                filteredLines = filteredLines.filter(line => line.toLowerCase().includes(filterKeyword.toLowerCase()));
            }
            return {
                success: true,
                data: {
                    totalLines: logLines.length,
                    requestedLines: lines,
                    filteredLines: filteredLines.length,
                    logLevel: logLevel,
                    filterKeyword: filterKeyword || null,
                    logs: filteredLines,
                    logFilePath: logFilePath
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to read project logs: ${error.message}`
            };
        }
    }
    async getLogFileInfo() {
        try {
            // Try multiple possible project paths
            let logFilePath = '';
            const possiblePaths = [
                Editor.Project ? Editor.Project.path : null,
                '/Users/lizhiyong/NewProject_3',
                process.cwd(),
            ].filter(p => p !== null);
            for (const basePath of possiblePaths) {
                const testPath = path.join(basePath, 'temp/logs/project.log');
                if (fs.existsSync(testPath)) {
                    logFilePath = testPath;
                    break;
                }
            }
            if (!logFilePath) {
                return {
                    success: false,
                    error: `Project log file not found. Tried paths: ${possiblePaths.map(p => path.join(p, 'temp/logs/project.log')).join(', ')}`
                };
            }
            const stats = fs.statSync(logFilePath);
            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const lineCount = logContent.split('\n').filter(line => line.trim() !== '').length;
            return {
                success: true,
                data: {
                    filePath: logFilePath,
                    fileSize: stats.size,
                    fileSizeFormatted: this.formatFileSize(stats.size),
                    lastModified: stats.mtime.toISOString(),
                    lineCount: lineCount,
                    created: stats.birthtime.toISOString(),
                    accessible: fs.constants.R_OK
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get log file info: ${error.message}`
            };
        }
    }
    async searchProjectLogs(pattern, maxResults = 20, contextLines = 2) {
        try {
            // Try multiple possible project paths
            let logFilePath = '';
            const possiblePaths = [
                Editor.Project ? Editor.Project.path : null,
                '/Users/lizhiyong/NewProject_3',
                process.cwd(),
            ].filter(p => p !== null);
            for (const basePath of possiblePaths) {
                const testPath = path.join(basePath, 'temp/logs/project.log');
                if (fs.existsSync(testPath)) {
                    logFilePath = testPath;
                    break;
                }
            }
            if (!logFilePath) {
                return {
                    success: false,
                    error: `Project log file not found. Tried paths: ${possiblePaths.map(p => path.join(p, 'temp/logs/project.log')).join(', ')}`
                };
            }
            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const logLines = logContent.split('\n');
            // Create regex pattern (support both string and regex patterns)
            let regex;
            try {
                regex = new RegExp(pattern, 'gi');
            }
            catch (_a) {
                // If pattern is not valid regex, treat as literal string
                regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            }
            const matches = [];
            let resultCount = 0;
            for (let i = 0; i < logLines.length && resultCount < maxResults; i++) {
                const line = logLines[i];
                if (regex.test(line)) {
                    // Get context lines
                    const contextStart = Math.max(0, i - contextLines);
                    const contextEnd = Math.min(logLines.length - 1, i + contextLines);
                    const contextLinesArray = [];
                    for (let j = contextStart; j <= contextEnd; j++) {
                        contextLinesArray.push({
                            lineNumber: j + 1,
                            content: logLines[j],
                            isMatch: j === i
                        });
                    }
                    matches.push({
                        lineNumber: i + 1,
                        matchedLine: line,
                        context: contextLinesArray
                    });
                    resultCount++;
                    // Reset regex lastIndex for global search
                    regex.lastIndex = 0;
                }
            }
            return {
                success: true,
                data: {
                    pattern: pattern,
                    totalMatches: matches.length,
                    maxResults: maxResults,
                    contextLines: contextLines,
                    logFilePath: logFilePath,
                    matches: matches
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search project logs: ${error.message}`
            };
        }
    }
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}
exports.DebugTools = DebugTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLFVBQVU7SUFJbkI7UUFIUSxvQkFBZSxHQUFxQixFQUFFLENBQUM7UUFDOUIsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFHaEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLG1CQUFtQjtRQUN2QixvQ0FBb0M7UUFDcEMsaUZBQWlGO1FBQ2pGLDJEQUEyRDtRQUMzRCxPQUFPLENBQUMsR0FBRyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7SUFDN0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE9BQVk7UUFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLGlCQUNyQixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsSUFDaEMsT0FBTyxFQUNaLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPO1lBQ0gsb0VBQW9FO1lBQ3BFLDRDQUE0QztZQUM1QztnQkFDSSxJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLHNCQUFzQjtnQkFDbkMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxFQUFFO2lCQUNqQjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUFFLHFDQUFxQztnQkFDbEQsV0FB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LENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLGtDQUFrQyxLQUFLLENBQUMsT0FBTyxFQUFFO2FBQzNELENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUFhO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUVsQixPQUFPLElBQUksSUFBSSxJQUFJLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLElBQUksQ0FBQztZQUNiLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0NBQ0o7QUF0bUJELGdDQXNtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIENvbnNvbGVNZXNzYWdlLCBQZXJmb3JtYW5jZVN0YXRzLCBWYWxpZGF0aW9uUmVzdWx0LCBWYWxpZGF0aW9uSXNzdWUgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgRGVidWdUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBjb25zb2xlTWVzc2FnZXM6IENvbnNvbGVNZXNzYWdlW10gPSBbXTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heE1lc3NhZ2VzID0gMTAwMDtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnNldHVwQ29uc29sZUNhcHR1cmUoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldHVwQ29uc29sZUNhcHR1cmUoKTogdm9pZCB7XG4gICAgICAgIC8vIEludGVyY2VwdCBFZGl0b3IgY29uc29sZSBtZXNzYWdlc1xuICAgICAgICAvLyBOb3RlOiBFZGl0b3IuTWVzc2FnZS5hZGRCcm9hZGNhc3RMaXN0ZW5lciBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbiBhbGwgdmVyc2lvbnNcbiAgICAgICAgLy8gVGhpcyBpcyBhIHBsYWNlaG9sZGVyIGZvciBjb25zb2xlIGNhcHR1cmUgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc29sZS5sb2coJ0NvbnNvbGUgY2FwdHVyZSBzZXR1cCAtIGltcGxlbWVudGF0aW9uIGRlcGVuZHMgb24gRWRpdG9yIEFQSSBhdmFpbGFiaWxpdHknKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFkZENvbnNvbGVNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IHZvaWQge1xuICAgICAgICB0aGlzLmNvbnNvbGVNZXNzYWdlcy5wdXNoKHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgLi4ubWVzc2FnZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBLZWVwIG9ubHkgbGF0ZXN0IG1lc3NhZ2VzXG4gICAgICAgIGlmICh0aGlzLmNvbnNvbGVNZXNzYWdlcy5sZW5ndGggPiB0aGlzLm1heE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGVNZXNzYWdlcy5zaGlmdCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAvLyB2MS42LjA6IGdldF9jb25zb2xlX2xvZ3MgKyBnZXRfcHJvamVjdF9sb2dzICsgc2VhcmNoX3Byb2plY3RfbG9nc1xuICAgICAgICAgICAgLy8gbWVyZ2VkIGludG8gYGxvZ3Moe2FjdGlvbn0pYCDigJQgc2VlIGJlbG93LlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjbGVhcl9jb25zb2xlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NsZWFyIGVkaXRvciBjb25zb2xlJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdleGVjdXRlX3NjcmlwdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFeGVjdXRlIEphdmFTY3JpcHQgaW4gc2NlbmUgY29udGV4dCcsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSmF2YVNjcmlwdCBjb2RlIHRvIGV4ZWN1dGUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NjcmlwdCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X25vZGVfdHJlZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgZGV0YWlsZWQgbm9kZSB0cmVlIGZvciBkZWJ1Z2dpbmcnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByb290VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUm9vdCBub2RlIFVVSUQgKG9wdGlvbmFsLCB1c2VzIHNjZW5lIHJvb3QgaWYgbm90IHByb3ZpZGVkKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhEZXB0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4aW11bSB0cmVlIGRlcHRoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X3BlcmZvcm1hbmNlX3N0YXRzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBwZXJmb3JtYW5jZSBzdGF0aXN0aWNzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd2YWxpZGF0ZV9zY2VuZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBjdXJyZW50IHNjZW5lIGZvciBpc3N1ZXMnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja01pc3NpbmdBc3NldHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGVjayBmb3IgbWlzc2luZyBhc3NldCByZWZlcmVuY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tQZXJmb3JtYW5jZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGZvciBwZXJmb3JtYW5jZSBpc3N1ZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9lZGl0b3JfaW5mbycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgZWRpdG9yIGFuZCBlbnZpcm9ubWVudCBpbmZvcm1hdGlvbicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X2xvZ19maWxlX2luZm8nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGluZm9ybWF0aW9uIGFib3V0IHRoZSBwcm9qZWN0IGxvZyBmaWxlJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2dzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VuaWZpZWQgbG9nIGFjY2VzcyAodjEuNi4wKS4gYWN0aW9uPWNvbnNvbGU6IGVkaXRvciBjb25zb2xlIGxpbmVzLiBhY3Rpb249cHJvamVjdDogcmVhZCBwcm9qZWN0LmxvZyB0YWlsLiBhY3Rpb249c2VhcmNoOiByZWdleCBzZWFyY2ggYWNyb3NzIHByb2plY3QubG9nLiBOT1RFOiByZXR1cm4gc2hhcGUgZGlmZmVycyBwZXIgYWN0aW9uIOKAlCBjb25zb2xlL3Byb2plY3QgcmV0dXJuIGxvZyBhcnJheXMsIHNlYXJjaCByZXR1cm5zIG1hdGNoIG9iamVjdHMgd2l0aCBsb2NhdGlvbi9jb250ZXh0LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY29uc29sZScsICdwcm9qZWN0JywgJ3NlYXJjaCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hpY2ggbG9nIHNvdXJjZSAvIG9wZXJhdGlvbidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdGb3IgY29uc29sZTogcmVjZW50IE4gKGRlZmF1bHQgMTAwKScsIGRlZmF1bHQ6IDEwMCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydhbGwnLCAnbG9nJywgJ3dhcm4nLCAnZXJyb3InLCAnaW5mbyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9yIGNvbnNvbGU6IGZpbHRlciBieSBsb2cgdHlwZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lczogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdGb3IgcHJvamVjdDogdGFpbCBOIGxpbmVzIChkZWZhdWx0IDEwMCknLCBkZWZhdWx0OiAxMDAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcktleXdvcmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRm9yIHByb2plY3Q6IGtleXdvcmQgZmlsdGVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nTGV2ZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ0VSUk9SJywgJ1dBUk4nLCAnSU5GTycsICdERUJVRycsICdUUkFDRScsICdBTEwnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvciBwcm9qZWN0OiBsb2cgbGV2ZWwgZmlsdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnQUxMJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRm9yIHNlYXJjaDogcmVnZXggcGF0dGVybicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnRm9yIHNlYXJjaDogbWF4IG1hdGNoZXMgKGRlZmF1bHQgMjApJywgZGVmYXVsdDogMjAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRMaW5lczogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdGb3Igc2VhcmNoOiBjb250ZXh0IGxpbmVzIHBlciBtYXRjaCAoZGVmYXVsdCAyKScsIGRlZmF1bHQ6IDIgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jb25zb2xlX2xvZ3MnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbnNvbGVMb2dzKGFyZ3MubGltaXQsIGFyZ3MuZmlsdGVyKTtcbiAgICAgICAgICAgIGNhc2UgJ2NsZWFyX2NvbnNvbGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNsZWFyQ29uc29sZSgpO1xuICAgICAgICAgICAgY2FzZSAnZXhlY3V0ZV9zY3JpcHQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVTY3JpcHQoYXJncy5zY3JpcHQpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X25vZGVfdHJlZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Tm9kZVRyZWUoYXJncy5yb290VXVpZCwgYXJncy5tYXhEZXB0aCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfcGVyZm9ybWFuY2Vfc3RhdHMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFBlcmZvcm1hbmNlU3RhdHMoKTtcbiAgICAgICAgICAgIGNhc2UgJ3ZhbGlkYXRlX3NjZW5lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZVNjZW5lKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2VkaXRvcl9pbmZvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRFZGl0b3JJbmZvKCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfcHJvamVjdF9sb2dzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRQcm9qZWN0TG9ncyhhcmdzLmxpbmVzLCBhcmdzLmZpbHRlcktleXdvcmQsIGFyZ3MubG9nTGV2ZWwpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2xvZ19maWxlX2luZm8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldExvZ0ZpbGVJbmZvKCk7XG4gICAgICAgICAgICBjYXNlICdzZWFyY2hfcHJvamVjdF9sb2dzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZWFyY2hQcm9qZWN0TG9ncyhhcmdzLnBhdHRlcm4sIGFyZ3MubWF4UmVzdWx0cywgYXJncy5jb250ZXh0TGluZXMpO1xuICAgICAgICAgICAgY2FzZSAnbG9ncyc6XG4gICAgICAgICAgICAgICAgLy8gdjEuNi4wIHVuaWZpZWQgYWN0aW9uLWNvZGUgZGlzcGF0Y2hlclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29uc29sZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb25zb2xlTG9ncyhhcmdzLmxpbWl0LCBhcmdzLmZpbHRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Byb2plY3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJvamVjdExvZ3MoYXJncy5saW5lcywgYXJncy5maWx0ZXJLZXl3b3JkLCBhcmdzLmxvZ0xldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2VhcmNoJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaFByb2plY3RMb2dzKGFyZ3MucGF0dGVybiwgYXJncy5tYXhSZXN1bHRzLCBhcmdzLmNvbnRleHRMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgVW5rbm93biBsb2dzIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ29kZTogJ0lOVkFMSURfUEFSQU1TJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29uc29sZUxvZ3MobGltaXQ6IG51bWJlciA9IDEwMCwgZmlsdGVyOiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGxldCBsb2dzID0gdGhpcy5jb25zb2xlTWVzc2FnZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoZmlsdGVyICE9PSAnYWxsJykge1xuICAgICAgICAgICAgbG9ncyA9IGxvZ3MuZmlsdGVyKGxvZyA9PiBsb2cudHlwZSA9PT0gZmlsdGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlY2VudExvZ3MgPSBsb2dzLnNsaWNlKC1saW1pdCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB0b3RhbDogbG9ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgcmV0dXJuZWQ6IHJlY2VudExvZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGxvZ3M6IHJlY2VudExvZ3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyQ29uc29sZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0aGlzLmNvbnNvbGVNZXNzYWdlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIE5vdGU6IEVkaXRvci5NZXNzYWdlLnNlbmQgbWF5IG5vdCByZXR1cm4gYSBwcm9taXNlIGluIGFsbCB2ZXJzaW9uc1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2Uuc2VuZCgnY29uc29sZScsICdjbGVhcicpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdDb25zb2xlIGNsZWFyZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjcmlwdChzY3JpcHQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvbnNvbGUnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2V2YWwnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtzY3JpcHRdXG4gICAgICAgICAgICB9KS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY3JpcHQgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Tm9kZVRyZWUocm9vdFV1aWQ/OiBzdHJpbmcsIG1heERlcHRoOiBudW1iZXIgPSAxMCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnVpbGRUcmVlID0gYXN5bmMgKG5vZGVVdWlkOiBzdHJpbmcsIGRlcHRoOiBudW1iZXIgPSAwKTogUHJvbWlzZTxhbnk+ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHJ1bmNhdGVkOiB0cnVlIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVEYXRhLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlRGF0YS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlRGF0YS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiAobm9kZURhdGEgYXMgYW55KS5jb21wb25lbnRzID8gKG5vZGVEYXRhIGFzIGFueSkuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy5fX3R5cGVfXykgOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkQ291bnQ6IG5vZGVEYXRhLmNoaWxkcmVuID8gbm9kZURhdGEuY2hpbGRyZW4ubGVuZ3RoIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSBhcyBhbnlbXVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlRGF0YS5jaGlsZHJlbiAmJiBub2RlRGF0YS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkSWQgb2Ygbm9kZURhdGEuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZFRyZWUgPSBhd2FpdCBidWlsZFRyZWUoY2hpbGRJZCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcmVuLnB1c2goY2hpbGRUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmVlO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChyb290VXVpZCkge1xuICAgICAgICAgICAgICAgIGJ1aWxkVHJlZShyb290VXVpZCkudGhlbih0cmVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRyZWUgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWhpZXJhcmNoeScpLnRoZW4oYXN5bmMgKGhpZXJhcmNoeTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyZWVzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgcm9vdE5vZGUgb2YgaGllcmFyY2h5LmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgYnVpbGRUcmVlKHJvb3ROb2RlLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJlZXMucHVzaCh0cmVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdHJlZXMgfSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UGVyZm9ybWFuY2VTdGF0cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LXBlcmZvcm1hbmNlJykudGhlbigoc3RhdHM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBlcmZTdGF0czogUGVyZm9ybWFuY2VTdGF0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiBzdGF0cy5ub2RlQ291bnQgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IHN0YXRzLmNvbXBvbmVudENvdW50IHx8IDAsXG4gICAgICAgICAgICAgICAgICAgIGRyYXdDYWxsczogc3RhdHMuZHJhd0NhbGxzIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgIHRyaWFuZ2xlczogc3RhdHMudHJpYW5nbGVzIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgIG1lbW9yeTogc3RhdHMubWVtb3J5IHx8IHt9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcGVyZlN0YXRzIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGJhc2ljIHN0YXRzXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQZXJmb3JtYW5jZSBzdGF0cyBub3QgYXZhaWxhYmxlIGluIGVkaXQgbW9kZSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVTY2VuZShvcHRpb25zOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBpc3N1ZXM6IFZhbGlkYXRpb25Jc3N1ZVtdID0gW107XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBtaXNzaW5nIGFzc2V0c1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2hlY2tNaXNzaW5nQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRDaGVjayA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NoZWNrLW1pc3NpbmctYXNzZXRzJyk7XG4gICAgICAgICAgICAgICAgaWYgKGFzc2V0Q2hlY2sgJiYgYXNzZXRDaGVjay5taXNzaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ2Fzc2V0cycsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHthc3NldENoZWNrLm1pc3NpbmcubGVuZ3RofSBtaXNzaW5nIGFzc2V0IHJlZmVyZW5jZXNgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsczogYXNzZXRDaGVjay5taXNzaW5nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHBlcmZvcm1hbmNlIGlzc3Vlc1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2hlY2tQZXJmb3JtYW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWhpZXJhcmNoeScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVDb3VudCA9IHRoaXMuY291bnROb2RlcyhoaWVyYXJjaHkuY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChub2RlQ291bnQgPiAxMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd3YXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAncGVyZm9ybWFuY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEhpZ2ggbm9kZSBjb3VudDogJHtub2RlQ291bnR9IG5vZGVzIChyZWNvbW1lbmRlZCA8IDEwMDApYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdDb25zaWRlciB1c2luZyBvYmplY3QgcG9vbGluZyBvciBzY2VuZSBvcHRpbWl6YXRpb24nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBWYWxpZGF0aW9uUmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIHZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgICAgIGlzc3VlQ291bnQ6IGlzc3Vlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgaXNzdWVzOiBpc3N1ZXNcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdCB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb3VudE5vZGVzKG5vZGVzOiBhbnlbXSk6IG51bWJlciB7XG4gICAgICAgIGxldCBjb3VudCA9IG5vZGVzLmxlbmd0aDtcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIGNvdW50ICs9IHRoaXMuY291bnROb2Rlcyhub2RlLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRFZGl0b3JJbmZvKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICBlZGl0b3I6IHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAoRWRpdG9yIGFzIGFueSkudmVyc2lvbnM/LmVkaXRvciB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgY29jb3NWZXJzaW9uOiAoRWRpdG9yIGFzIGFueSkudmVyc2lvbnM/LmNvY29zIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICBwbGF0Zm9ybTogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICAgICAgICAgICAgICBhcmNoOiBwcm9jZXNzLmFyY2gsXG4gICAgICAgICAgICAgICAgbm9kZVZlcnNpb246IHByb2Nlc3MudmVyc2lvblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2plY3Q6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBFZGl0b3IuUHJvamVjdC5uYW1lLFxuICAgICAgICAgICAgICAgIHBhdGg6IEVkaXRvci5Qcm9qZWN0LnBhdGgsXG4gICAgICAgICAgICAgICAgdXVpZDogRWRpdG9yLlByb2plY3QudXVpZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1lbW9yeTogcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLFxuICAgICAgICAgICAgdXB0aW1lOiBwcm9jZXNzLnVwdGltZSgpXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaW5mbyB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJvamVjdExvZ3MobGluZXM6IG51bWJlciA9IDEwMCwgZmlsdGVyS2V5d29yZD86IHN0cmluZywgbG9nTGV2ZWw6IHN0cmluZyA9ICdBTEwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSBtdWx0aXBsZSBwb3NzaWJsZSBwcm9qZWN0IHBhdGhzXG4gICAgICAgICAgICBsZXQgbG9nRmlsZVBhdGggPSAnJztcbiAgICAgICAgICAgIGNvbnN0IHBvc3NpYmxlUGF0aHMgPSBbXG4gICAgICAgICAgICAgICAgRWRpdG9yLlByb2plY3QgPyBFZGl0b3IuUHJvamVjdC5wYXRoIDogbnVsbCxcbiAgICAgICAgICAgICAgICAnL1VzZXJzL2xpemhpeW9uZy9OZXdQcm9qZWN0XzMnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXG4gICAgICAgICAgICBdLmZpbHRlcihwID0+IHAgIT09IG51bGwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHBvc3NpYmxlUGF0aHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0UGF0aCA9IHBhdGguam9pbihiYXNlUGF0aCwgJ3RlbXAvbG9ncy9wcm9qZWN0LmxvZycpO1xuICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dGaWxlUGF0aCA9IHRlc3RQYXRoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghbG9nRmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9qZWN0IGxvZyBmaWxlIG5vdCBmb3VuZC4gVHJpZWQgcGF0aHM6ICR7cG9zc2libGVQYXRocy5tYXAocCA9PiBwYXRoLmpvaW4ocCwgJ3RlbXAvbG9ncy9wcm9qZWN0LmxvZycpKS5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWFkIHRoZSBmaWxlIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IGxvZ0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobG9nRmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICBjb25zdCBsb2dMaW5lcyA9IGxvZ0NvbnRlbnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCB0aGUgbGFzdCBOIGxpbmVzXG4gICAgICAgICAgICBjb25zdCByZWNlbnRMaW5lcyA9IGxvZ0xpbmVzLnNsaWNlKC1saW5lcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFwcGx5IGZpbHRlcnNcbiAgICAgICAgICAgIGxldCBmaWx0ZXJlZExpbmVzID0gcmVjZW50TGluZXM7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbHRlciBieSBsb2cgbGV2ZWwgaWYgbm90ICdBTEwnXG4gICAgICAgICAgICBpZiAobG9nTGV2ZWwgIT09ICdBTEwnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyZWRMaW5lcyA9IGZpbHRlcmVkTGluZXMuZmlsdGVyKGxpbmUgPT4gXG4gICAgICAgICAgICAgICAgICAgIGxpbmUuaW5jbHVkZXMoYFske2xvZ0xldmVsfV1gKSB8fCBsaW5lLmluY2x1ZGVzKGxvZ0xldmVsLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlsdGVyIGJ5IGtleXdvcmQgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChmaWx0ZXJLZXl3b3JkKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyZWRMaW5lcyA9IGZpbHRlcmVkTGluZXMuZmlsdGVyKGxpbmUgPT4gXG4gICAgICAgICAgICAgICAgICAgIGxpbmUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhmaWx0ZXJLZXl3b3JkLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxMaW5lczogbG9nTGluZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0ZWRMaW5lczogbGluZXMsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkTGluZXM6IGZpbHRlcmVkTGluZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBsb2dMZXZlbDogbG9nTGV2ZWwsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcktleXdvcmQ6IGZpbHRlcktleXdvcmQgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgbG9nczogZmlsdGVyZWRMaW5lcyxcbiAgICAgICAgICAgICAgICAgICAgbG9nRmlsZVBhdGg6IGxvZ0ZpbGVQYXRoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZWFkIHByb2plY3QgbG9nczogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldExvZ0ZpbGVJbmZvKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcHJvamVjdCBwYXRoc1xuICAgICAgICAgICAgbGV0IGxvZ0ZpbGVQYXRoID0gJyc7XG4gICAgICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xuICAgICAgICAgICAgICAgIEVkaXRvci5Qcm9qZWN0ID8gRWRpdG9yLlByb2plY3QucGF0aCA6IG51bGwsXG4gICAgICAgICAgICAgICAgJy9Vc2Vycy9saXpoaXlvbmcvTmV3UHJvamVjdF8zJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICAgICAgXS5maWx0ZXIocCA9PiBwICE9PSBudWxsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChjb25zdCBiYXNlUGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdFBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKTtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0UGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nRmlsZVBhdGggPSB0ZXN0UGF0aDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWxvZ0ZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvamVjdCBsb2cgZmlsZSBub3QgZm91bmQuIFRyaWVkIHBhdGhzOiAke3Bvc3NpYmxlUGF0aHMubWFwKHAgPT4gcGF0aC5qb2luKHAsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKSkuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBmcy5zdGF0U3luYyhsb2dGaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBsb2dDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGxvZ0ZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgbGluZUNvdW50ID0gbG9nQ29udGVudC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkgIT09ICcnKS5sZW5ndGg7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBsb2dGaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgZmlsZVNpemU6IHN0YXRzLnNpemUsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplRm9ybWF0dGVkOiB0aGlzLmZvcm1hdEZpbGVTaXplKHN0YXRzLnNpemUpLFxuICAgICAgICAgICAgICAgICAgICBsYXN0TW9kaWZpZWQ6IHN0YXRzLm10aW1lLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb3VudDogbGluZUNvdW50LFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkOiBzdGF0cy5iaXJ0aHRpbWUudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgYWNjZXNzaWJsZTogZnMuY29uc3RhbnRzLlJfT0tcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBsb2cgZmlsZSBpbmZvOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2VhcmNoUHJvamVjdExvZ3MocGF0dGVybjogc3RyaW5nLCBtYXhSZXN1bHRzOiBudW1iZXIgPSAyMCwgY29udGV4dExpbmVzOiBudW1iZXIgPSAyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSBtdWx0aXBsZSBwb3NzaWJsZSBwcm9qZWN0IHBhdGhzXG4gICAgICAgICAgICBsZXQgbG9nRmlsZVBhdGggPSAnJztcbiAgICAgICAgICAgIGNvbnN0IHBvc3NpYmxlUGF0aHMgPSBbXG4gICAgICAgICAgICAgICAgRWRpdG9yLlByb2plY3QgPyBFZGl0b3IuUHJvamVjdC5wYXRoIDogbnVsbCxcbiAgICAgICAgICAgICAgICAnL1VzZXJzL2xpemhpeW9uZy9OZXdQcm9qZWN0XzMnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXG4gICAgICAgICAgICBdLmZpbHRlcihwID0+IHAgIT09IG51bGwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHBvc3NpYmxlUGF0aHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0UGF0aCA9IHBhdGguam9pbihiYXNlUGF0aCwgJ3RlbXAvbG9ncy9wcm9qZWN0LmxvZycpO1xuICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dGaWxlUGF0aCA9IHRlc3RQYXRoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghbG9nRmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9qZWN0IGxvZyBmaWxlIG5vdCBmb3VuZC4gVHJpZWQgcGF0aHM6ICR7cG9zc2libGVQYXRocy5tYXAocCA9PiBwYXRoLmpvaW4ocCwgJ3RlbXAvbG9ncy9wcm9qZWN0LmxvZycpKS5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBsb2dDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGxvZ0ZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgbG9nTGluZXMgPSBsb2dDb250ZW50LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHJlZ2V4IHBhdHRlcm4gKHN1cHBvcnQgYm90aCBzdHJpbmcgYW5kIHJlZ2V4IHBhdHRlcm5zKVxuICAgICAgICAgICAgbGV0IHJlZ2V4OiBSZWdFeHA7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCAnZ2knKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElmIHBhdHRlcm4gaXMgbm90IHZhbGlkIHJlZ2V4LCB0cmVhdCBhcyBsaXRlcmFsIHN0cmluZ1xuICAgICAgICAgICAgICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChwYXR0ZXJuLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJyksICdnaScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IHJlc3VsdENvdW50ID0gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb2dMaW5lcy5sZW5ndGggJiYgcmVzdWx0Q291bnQgPCBtYXhSZXN1bHRzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5lID0gbG9nTGluZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHJlZ2V4LnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGNvbnRleHQgbGluZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGV4dFN0YXJ0ID0gTWF0aC5tYXgoMCwgaSAtIGNvbnRleHRMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRFbmQgPSBNYXRoLm1pbihsb2dMaW5lcy5sZW5ndGggLSAxLCBpICsgY29udGV4dExpbmVzKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRMaW5lc0FycmF5ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSBjb250ZXh0U3RhcnQ7IGogPD0gY29udGV4dEVuZDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0TGluZXNBcnJheS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBqICsgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBsb2dMaW5lc1tqXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc01hdGNoOiBqID09PSBpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZExpbmU6IGxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0TGluZXNBcnJheVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdENvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCByZWdleCBsYXN0SW5kZXggZm9yIGdsb2JhbCBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgcmVnZXgubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHBhdHRlcm4sXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTWF0Y2hlczogbWF0Y2hlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IG1heFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRMaW5lczogY29udGV4dExpbmVzLFxuICAgICAgICAgICAgICAgICAgICBsb2dGaWxlUGF0aDogbG9nRmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXM6IG1hdGNoZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHNlYXJjaCBwcm9qZWN0IGxvZ3M6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBmb3JtYXRGaWxlU2l6ZShieXRlczogbnVtYmVyKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgdW5pdHMgPSBbJ0InLCAnS0InLCAnTUInLCAnR0InXTtcbiAgICAgICAgbGV0IHNpemUgPSBieXRlcztcbiAgICAgICAgbGV0IHVuaXRJbmRleCA9IDA7XG4gICAgICAgIFxuICAgICAgICB3aGlsZSAoc2l6ZSA+PSAxMDI0ICYmIHVuaXRJbmRleCA8IHVuaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHNpemUgLz0gMTAyNDtcbiAgICAgICAgICAgIHVuaXRJbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYCR7c2l6ZS50b0ZpeGVkKDIpfSAke3VuaXRzW3VuaXRJbmRleF19YDtcbiAgICB9XG59Il19