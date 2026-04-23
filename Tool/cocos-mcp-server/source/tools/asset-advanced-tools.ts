import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { createErrorResponse, ERROR_CODES } from '../utils/error-response';

export class AssetAdvancedTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'save_asset_meta',
                description: 'Save asset meta information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID'
                        },
                        content: {
                            type: 'string',
                            description: 'Asset meta serialized content string'
                        }
                    },
                    required: ['urlOrUUID', 'content']
                }
            },
            {
                name: 'generate_available_url',
                description: 'Generate an available URL based on input URL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'Asset URL to generate available URL for'
                        }
                    },
                    required: ['url']
                }
            },
            {
                name: 'query_asset_db_ready',
                description: 'Check if asset database is ready',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'open_asset_external',
                description: 'Open asset with external program',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID to open'
                        }
                    },
                    required: ['urlOrUUID']
                }
            },
            {
                name: 'batch_import_assets',
                description: 'Import multiple assets in batch',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourceDirectory: {
                            type: 'string',
                            description: 'Source directory path'
                        },
                        targetDirectory: {
                            type: 'string',
                            description: 'Target directory URL'
                        },
                        fileFilter: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include (e.g., [".png", ".jpg"])',
                            default: []
                        },
                        recursive: {
                            type: 'boolean',
                            description: 'Include subdirectories',
                            default: false
                        },
                        overwrite: {
                            type: 'boolean',
                            description: 'Overwrite existing files',
                            default: false
                        }
                    },
                    required: ['sourceDirectory', 'targetDirectory']
                }
            },
            {
                name: 'batch_delete_assets',
                description: 'Delete multiple assets in batch',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urls: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of asset URLs to delete'
                        }
                    },
                    required: ['urls']
                }
            },
            {
                name: 'validate_asset_references',
                description: 'Validate asset references and find broken links',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory to validate (default: entire project)',
                            default: 'db://assets'
                        }
                    }
                }
            },
            {
                name: 'get_asset_dependencies',
                description: 'Get asset dependency tree',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID'
                        },
                        direction: {
                            type: 'string',
                            description: 'Dependency direction',
                            enum: ['dependents', 'dependencies', 'both'],
                            default: 'dependencies'
                        }
                    },
                    required: ['urlOrUUID']
                }
            },
            {
                name: 'get_unused_assets',
                description: 'Find unused assets in project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory to scan (default: entire project)',
                            default: 'db://assets'
                        },
                        excludeDirectories: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Directories to exclude from scan',
                            default: []
                        }
                    }
                }
            },
            {
                name: 'compress_textures',
                description: 'Batch compress texture assets',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory containing textures',
                            default: 'db://assets'
                        },
                        format: {
                            type: 'string',
                            description: 'Compression format',
                            enum: ['auto', 'jpg', 'png', 'webp'],
                            default: 'auto'
                        },
                        quality: {
                            type: 'number',
                            description: 'Compression quality (0.1-1.0)',
                            minimum: 0.1,
                            maximum: 1.0,
                            default: 0.8
                        }
                    }
                }
            },
            {
                name: 'export_asset_manifest',
                description: 'Export asset manifest/inventory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory to export manifest for',
                            default: 'db://assets'
                        },
                        format: {
                            type: 'string',
                            description: 'Export format',
                            enum: ['json', 'csv', 'xml'],
                            default: 'json'
                        },
                        includeMetadata: {
                            type: 'boolean',
                            description: 'Include asset metadata',
                            default: true
                        }
                    }
                }
            },
            {
                name: 'batch_configure',
                description: 'Batch-fix meta (type / wrapMode) on N assets. Collapses 15-call workflow to 2. See FEATURE_GUIDE §附录 C.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urls: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Target asset URLs (db:// prefix). E.g. ["db://assets/icons/a.png", ...]'
                        },
                        config: {
                            type: 'object',
                            description: 'Fields to apply to every URL. At least one field required.',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['sprite-frame', 'texture'],
                                    description: 'Set meta.userData.type. Fixes ERR-018 #1 (png imported as texture instead of sprite-frame).'
                                },
                                wrapModeS: {
                                    type: 'string',
                                    enum: ['repeat', 'clamp-to-edge', 'mirrored-repeat'],
                                    description: 'Applied to every subMeta whose userData contains a wrapModeS field. Fixes ERR-018 #3 for non-POT textures.'
                                },
                                wrapModeT: {
                                    type: 'string',
                                    enum: ['repeat', 'clamp-to-edge', 'mirrored-repeat'],
                                    description: 'Same as wrapModeS for T axis.'
                                }
                            }
                        }
                    },
                    required: ['urls', 'config']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'save_asset_meta':
                return await this.saveAssetMeta(args.urlOrUUID, args.content);
            case 'generate_available_url':
                return await this.generateAvailableUrl(args.url);
            case 'query_asset_db_ready':
                return await this.queryAssetDbReady();
            case 'open_asset_external':
                return await this.openAssetExternal(args.urlOrUUID);
            case 'batch_import_assets':
                return await this.batchImportAssets(args);
            case 'batch_delete_assets':
                return await this.batchDeleteAssets(args.urls);
            case 'validate_asset_references':
                return await this.validateAssetReferences(args.directory);
            case 'get_asset_dependencies':
                return await this.getAssetDependencies(args.urlOrUUID, args.direction);
            case 'get_unused_assets':
                return await this.getUnusedAssets(args.directory, args.excludeDirectories);
            case 'compress_textures':
                return await this.compressTextures(args.directory, args.format, args.quality);
            case 'export_asset_manifest':
                return await this.exportAssetManifest(args.directory, args.format, args.includeMetadata);
            case 'batch_configure':
                return await this.batchConfigureAssets(args.urls, args.config);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async saveAssetMeta(urlOrUUID: string, content: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset-meta', urlOrUUID, content).then((result: any) => {
                resolve({
                    success: true,
                    data: {
                        uuid: result?.uuid,
                        url: result?.url,
                        message: 'Asset meta saved successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    /**
     * Batch-apply meta field changes across N assets in one call.
     * Mutates only fields that match config keys; preserves everything else in each meta.
     * Per-URL failures are isolated — other URLs continue.
     */
    private async batchConfigureAssets(
        urls: string[],
        config: { type?: string; wrapModeS?: string; wrapModeT?: string }
    ): Promise<ToolResponse> {
        if (!Array.isArray(urls) || urls.length === 0) {
            return createErrorResponse(
                ERROR_CODES.INVALID_PARAMS,
                'urls must be a non-empty string array',
                { suggestion: 'Pass an array of db:// asset URLs, e.g. ["db://assets/a.png", "db://assets/b.png"]' }
            );
        }
        if (!config || Object.keys(config).length === 0) {
            return createErrorResponse(
                ERROR_CODES.INVALID_PARAMS,
                'config object is empty; at least one of type/wrapModeS/wrapModeT is required',
                { suggestion: 'Example: { "type": "sprite-frame", "wrapModeS": "clamp-to-edge", "wrapModeT": "clamp-to-edge" }' }
            );
        }

        const succeeded: Array<{ url: string; applied: Record<string, boolean> }> = [];
        const failed: Array<{ url: string; error: string; errorCode: string }> = [];

        for (const url of urls) {
            try {
                const raw: any = await Editor.Message.request('asset-db', 'query-asset-meta', url);
                if (!raw) {
                    failed.push({ url, error: 'meta not found', errorCode: ERROR_CODES.NOT_FOUND });
                    continue;
                }
                // Cocos may return meta as object or JSON string — normalize.
                const meta: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
                const applied: Record<string, boolean> = { type: false, wrapModeS: false, wrapModeT: false };

                if (config.type !== undefined) {
                    meta.userData = meta.userData || {};
                    meta.userData.type = config.type;
                    applied.type = true;
                }

                if (config.wrapModeS !== undefined || config.wrapModeT !== undefined) {
                    const subMetas = meta.subMetas || {};
                    for (const subId of Object.keys(subMetas)) {
                        const sub = subMetas[subId];
                        if (!sub || !sub.userData) continue;
                        const hasWrap = 'wrapModeS' in sub.userData || 'wrapModeT' in sub.userData;
                        if (!hasWrap) continue;
                        if (config.wrapModeS !== undefined) {
                            sub.userData.wrapModeS = config.wrapModeS;
                            applied.wrapModeS = true;
                        }
                        if (config.wrapModeT !== undefined) {
                            sub.userData.wrapModeT = config.wrapModeT;
                            applied.wrapModeT = true;
                        }
                    }
                }

                await Editor.Message.request('asset-db', 'save-asset-meta', url, JSON.stringify(meta));
                succeeded.push({ url, applied });
            } catch (err: any) {
                failed.push({
                    url,
                    error: err?.message || String(err),
                    errorCode: ERROR_CODES.EDITOR_API_ERROR
                });
            }
        }

        const allFailed = succeeded.length === 0 && failed.length > 0;
        if (allFailed) {
            return createErrorResponse(
                ERROR_CODES.EDITOR_API_ERROR,
                `All ${failed.length} URL(s) failed to configure`,
                { failed, suggestion: 'Check per-URL error codes; consider running reimport_asset first if wrapMode changes did not persist' }
            );
        }
        return {
            success: true,
            data: {
                succeededCount: succeeded.length,
                failedCount: failed.length,
                succeeded,
                failed
            },
            ...(failed.length > 0 ? { warning: `${failed.length} of ${urls.length} URL(s) failed — see data.failed` } : {})
        };
    }

    private async generateAvailableUrl(url: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'generate-available-url', url).then((availableUrl: string) => {
                resolve({
                    success: true,
                    data: {
                        originalUrl: url,
                        availableUrl: availableUrl,
                        message: availableUrl === url ? 
                            'URL is available' : 
                            'Generated new available URL'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryAssetDbReady(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-ready').then((ready: boolean) => {
                resolve({
                    success: true,
                    data: {
                        ready: ready,
                        message: ready ? 'Asset database is ready' : 'Asset database is not ready'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async openAssetExternal(urlOrUUID: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'open-asset', urlOrUUID).then(() => {
                resolve({
                    success: true,
                    message: 'Asset opened with external program'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async batchImportAssets(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const fs = require('fs');
                const path = require('path');
                
                if (!fs.existsSync(args.sourceDirectory)) {
                    resolve({ success: false, error: 'Source directory does not exist' });
                    return;
                }

                const files = this.getFilesFromDirectory(
                    args.sourceDirectory, 
                    args.fileFilter || [], 
                    args.recursive || false
                );

                const importResults: any[] = [];
                let successCount = 0;
                let errorCount = 0;

                for (const filePath of files) {
                    try {
                        const fileName = path.basename(filePath);
                        const targetPath = `${args.targetDirectory}/${fileName}`;
                        
                        const result = await Editor.Message.request('asset-db', 'import-asset', 
                            filePath, targetPath, { 
                                overwrite: args.overwrite || false,
                                rename: !(args.overwrite || false)
                            });
                        
                        importResults.push({
                            source: filePath,
                            target: targetPath,
                            success: true,
                            uuid: result?.uuid
                        });
                        successCount++;
                    } catch (err: any) {
                        importResults.push({
                            source: filePath,
                            success: false,
                            error: err.message
                        });
                        errorCount++;
                    }
                }

                resolve({
                    success: true,
                    data: {
                        totalFiles: files.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        results: importResults,
                        message: `Batch import completed: ${successCount} success, ${errorCount} errors`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private getFilesFromDirectory(dirPath: string, fileFilter: string[], recursive: boolean): string[] {
        const fs = require('fs');
        const path = require('path');
        const files: string[] = [];

        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile()) {
                if (fileFilter.length === 0 || fileFilter.some(ext => item.toLowerCase().endsWith(ext.toLowerCase()))) {
                    files.push(fullPath);
                }
            } else if (stat.isDirectory() && recursive) {
                files.push(...this.getFilesFromDirectory(fullPath, fileFilter, recursive));
            }
        }
        
        return files;
    }

    private async batchDeleteAssets(urls: string[]): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const deleteResults: any[] = [];
                let successCount = 0;
                let errorCount = 0;

                for (const url of urls) {
                    try {
                        await Editor.Message.request('asset-db', 'delete-asset', url);
                        deleteResults.push({
                            url: url,
                            success: true
                        });
                        successCount++;
                    } catch (err: any) {
                        deleteResults.push({
                            url: url,
                            success: false,
                            error: err.message
                        });
                        errorCount++;
                    }
                }

                resolve({
                    success: true,
                    data: {
                        totalAssets: urls.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        results: deleteResults,
                        message: `Batch delete completed: ${successCount} success, ${errorCount} errors`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async validateAssetReferences(directory: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Get all assets in directory
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                
                const brokenReferences: any[] = [];
                const validReferences: any[] = [];

                for (const asset of assets) {
                    try {
                        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                        if (assetInfo) {
                            validReferences.push({
                                url: asset.url,
                                uuid: asset.uuid,
                                name: asset.name
                            });
                        }
                    } catch (err) {
                        brokenReferences.push({
                            url: asset.url,
                            uuid: asset.uuid,
                            name: asset.name,
                            error: (err as Error).message
                        });
                    }
                }

                resolve({
                    success: true,
                    data: {
                        directory: directory,
                        totalAssets: assets.length,
                        validReferences: validReferences.length,
                        brokenReferences: brokenReferences.length,
                        brokenAssets: brokenReferences,
                        message: `Validation completed: ${brokenReferences.length} broken references found`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async getAssetDependencies(urlOrUUID: string, direction: string = 'dependencies'): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Note: This would require scene analysis or additional APIs not available in current documentation
            resolve({
                success: false,
                error: 'Asset dependency analysis requires additional APIs not available in current Cocos Creator MCP implementation. Consider using the Editor UI for dependency analysis.'
            });
        });
    }

    private async getUnusedAssets(directory: string = 'db://assets', excludeDirectories: string[] = []): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Note: This would require comprehensive project analysis
            resolve({
                success: false,
                error: 'Unused asset detection requires comprehensive project analysis not available in current Cocos Creator MCP implementation. Consider using the Editor UI or third-party tools for unused asset detection.'
            });
        });
    }

    private async compressTextures(directory: string = 'db://assets', format: string = 'auto', quality: number = 0.8): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Note: Texture compression would require image processing APIs
            resolve({
                success: false,
                error: 'Texture compression requires image processing capabilities not available in current Cocos Creator MCP implementation. Use the Editor\'s built-in texture compression settings or external tools.'
            });
        });
    }

    private async exportAssetManifest(directory: string = 'db://assets', format: string = 'json', includeMetadata: boolean = true): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                
                const manifest: any[] = [];

                for (const asset of assets) {
                    const manifestEntry: any = {
                        name: asset.name,
                        url: asset.url,
                        uuid: asset.uuid,
                        type: asset.type,
                        size: (asset as any).size || 0,
                        isDirectory: asset.isDirectory || false
                    };

                    if (includeMetadata) {
                        try {
                            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                            if (assetInfo && assetInfo.meta) {
                                manifestEntry.meta = assetInfo.meta;
                            }
                        } catch (err) {
                            // Skip metadata if not available
                        }
                    }

                    manifest.push(manifestEntry);
                }

                let exportData: string;
                switch (format) {
                    case 'json':
                        exportData = JSON.stringify(manifest, null, 2);
                        break;
                    case 'csv':
                        exportData = this.convertToCSV(manifest);
                        break;
                    case 'xml':
                        exportData = this.convertToXML(manifest);
                        break;
                    default:
                        exportData = JSON.stringify(manifest, null, 2);
                }

                resolve({
                    success: true,
                    data: {
                        directory: directory,
                        format: format,
                        assetCount: manifest.length,
                        includeMetadata: includeMetadata,
                        manifest: exportData,
                        message: `Asset manifest exported with ${manifest.length} assets`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private convertToCSV(data: any[]): string {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    private convertToXML(data: any[]): string {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<assets>\n';
        
        for (const item of data) {
            xml += '  <asset>\n';
            for (const [key, value] of Object.entries(item)) {
                const xmlValue = typeof value === 'object' ? 
                    JSON.stringify(value) : 
                    String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                xml += `    <${key}>${xmlValue}</${key}>\n`;
            }
            xml += '  </asset>\n';
        }
        
        xml += '</assets>';
        return xml;
    }
}