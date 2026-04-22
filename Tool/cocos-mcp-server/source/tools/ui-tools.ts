import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { ComponentTools } from './component-tools';
import { createErrorResponse, ERROR_CODES } from '../utils/error-response';

/**
 * UITools — semantic-layer shortcuts that build a `component_batch_set_properties`
 * call under the hood. Users supply only Cocos-known field names; propertyType is
 * filled in by this class, so AI doesn't have to remember every type hint.
 *
 * Undefined inputs are skipped (so partial updates work naturally).
 */
export class UITools implements ToolExecutor {
    private componentTools = new ComponentTools();

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'set_label',
                description: 'Semantic shortcut to update a cc.Label. Internally wraps component_batch_set_properties; every field is optional (omitted fields are not touched). Requires cc.Label already attached to the node.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Target node UUID (must already have cc.Label)' },
                        string: { type: 'string', description: 'Text content' },
                        fontSize: { type: 'number', description: 'Font size (pt)' },
                        lineHeight: { type: 'number', description: 'Line height' },
                        isBold: { type: 'boolean' },
                        isItalic: { type: 'boolean' },
                        isUnderline: { type: 'boolean' },
                        color: {
                            type: 'object',
                            description: 'RGBA 0-255',
                            properties: {
                                r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' }
                            }
                        },
                        horizontalAlign: { type: 'number', description: '0=LEFT, 1=CENTER, 2=RIGHT' },
                        verticalAlign: { type: 'number', description: '0=TOP, 1=CENTER, 2=BOTTOM' },
                        overflow: { type: 'number', description: '0=NONE, 1=CLAMP, 2=SHRINK, 3=RESIZE_HEIGHT' }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'set_layout',
                description: 'Semantic shortcut to update a cc.Layout. Internally wraps component_batch_set_properties.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Target node UUID (must already have cc.Layout)' },
                        type: { type: 'number', description: '0=NONE, 1=HORIZONTAL, 2=VERTICAL, 3=GRID' },
                        resizeMode: { type: 'number', description: '0=NONE, 1=CONTAINER, 2=CHILDREN' },
                        spacingX: { type: 'number' },
                        spacingY: { type: 'number' },
                        paddingLeft: { type: 'number' },
                        paddingRight: { type: 'number' },
                        paddingTop: { type: 'number' },
                        paddingBottom: { type: 'number' },
                        horizontalDirection: { type: 'number', description: '0=LEFT_TO_RIGHT, 1=RIGHT_TO_LEFT' },
                        verticalDirection: { type: 'number', description: '0=TOP_TO_BOTTOM, 1=BOTTOM_TO_TOP' }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'set_sprite',
                description: 'Semantic shortcut to update a cc.Sprite. Internally wraps component_batch_set_properties. Use spriteFrame to assign a SpriteFrame asset (UUID or db:// URL of the sub-sprite-frame).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Target node UUID (must already have cc.Sprite)' },
                        spriteFrame: {
                            type: 'string',
                            description: 'SpriteFrame UUID or db:// URL (of the sprite-frame sub-asset, e.g. "db://assets/icons/a.png/a")'
                        },
                        sizeMode: { type: 'number', description: '0=CUSTOM, 1=TRIMMED, 2=RAW' },
                        type: { type: 'number', description: '0=SIMPLE, 1=SLICED, 2=TILED, 3=FILLED' },
                        color: {
                            type: 'object',
                            description: 'Tint RGBA 0-255',
                            properties: {
                                r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' }
                            }
                        }
                    },
                    required: ['nodeUuid']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'set_label':
                return await this.setLabel(args);
            case 'set_layout':
                return await this.setLayout(args);
            case 'set_sprite':
                return await this.setSprite(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private validateNodeUuid(nodeUuid: any): ToolResponse | null {
        if (!nodeUuid || typeof nodeUuid !== 'string') {
            return createErrorResponse(
                ERROR_CODES.INVALID_PARAMS,
                'nodeUuid must be a non-empty string',
                { suggestion: 'Use get_all_nodes or find_node_by_name to obtain the UUID' }
            );
        }
        return null;
    }

    // Field → propertyType mapping for cc.Label
    private static readonly LABEL_TYPES: Record<string, string> = {
        string: 'string',
        fontSize: 'number',
        lineHeight: 'number',
        isBold: 'boolean',
        isItalic: 'boolean',
        isUnderline: 'boolean',
        color: 'color',
        horizontalAlign: 'number',
        verticalAlign: 'number',
        overflow: 'number'
    };

    // Field → propertyType mapping for cc.Layout (all numeric or enum)
    private static readonly LAYOUT_TYPES: Record<string, string> = {
        type: 'number',
        resizeMode: 'number',
        spacingX: 'number',
        spacingY: 'number',
        paddingLeft: 'number',
        paddingRight: 'number',
        paddingTop: 'number',
        paddingBottom: 'number',
        horizontalDirection: 'number',
        verticalDirection: 'number'
    };

    // Field → propertyType mapping for cc.Sprite
    private static readonly SPRITE_TYPES: Record<string, string> = {
        spriteFrame: 'spriteFrame',
        sizeMode: 'number',
        type: 'number',
        color: 'color'
    };

    private buildEntries(args: any, typeMap: Record<string, string>): Array<{ property: string; propertyType: string; value: any }> {
        const entries: Array<{ property: string; propertyType: string; value: any }> = [];
        for (const key of Object.keys(typeMap)) {
            if (args[key] !== undefined) {
                entries.push({ property: key, propertyType: typeMap[key], value: args[key] });
            }
        }
        return entries;
    }

    private async setLabel(args: any): Promise<ToolResponse> {
        const invalid = this.validateNodeUuid(args.nodeUuid);
        if (invalid) return invalid;
        const entries = this.buildEntries(args, UITools.LABEL_TYPES);
        if (entries.length === 0) {
            return createErrorResponse(
                ERROR_CODES.INVALID_PARAMS,
                'no Label fields supplied (all inputs undefined)',
                { suggestion: 'Provide at least one of: string, fontSize, color, isBold, ...' }
            );
        }
        return await this.componentTools.execute('batch_set_properties', {
            nodeUuid: args.nodeUuid,
            componentType: 'cc.Label',
            properties: entries
        });
    }

    private async setLayout(args: any): Promise<ToolResponse> {
        const invalid = this.validateNodeUuid(args.nodeUuid);
        if (invalid) return invalid;
        const entries = this.buildEntries(args, UITools.LAYOUT_TYPES);
        if (entries.length === 0) {
            return createErrorResponse(
                ERROR_CODES.INVALID_PARAMS,
                'no Layout fields supplied (all inputs undefined)',
                { suggestion: 'Provide at least one of: type, spacingX, paddingLeft, ...' }
            );
        }
        return await this.componentTools.execute('batch_set_properties', {
            nodeUuid: args.nodeUuid,
            componentType: 'cc.Layout',
            properties: entries
        });
    }

    private async setSprite(args: any): Promise<ToolResponse> {
        const invalid = this.validateNodeUuid(args.nodeUuid);
        if (invalid) return invalid;
        const entries = this.buildEntries(args, UITools.SPRITE_TYPES);
        if (entries.length === 0) {
            return createErrorResponse(
                ERROR_CODES.INVALID_PARAMS,
                'no Sprite fields supplied (all inputs undefined)',
                { suggestion: 'Provide at least one of: spriteFrame, sizeMode, type, color' }
            );
        }
        return await this.componentTools.execute('batch_set_properties', {
            nodeUuid: args.nodeUuid,
            componentType: 'cc.Sprite',
            properties: entries
        });
    }
}
