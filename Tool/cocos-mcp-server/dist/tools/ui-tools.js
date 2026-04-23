"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UITools = void 0;
const component_tools_1 = require("./component-tools");
const error_response_1 = require("../utils/error-response");
/**
 * UITools — semantic-layer shortcuts that build a `component_batch_set_properties`
 * call under the hood. Users supply only Cocos-known field names; propertyType is
 * filled in by this class, so AI doesn't have to remember every type hint.
 *
 * Undefined inputs are skipped (so partial updates work naturally).
 */
class UITools {
    constructor() {
        this.componentTools = new component_tools_1.ComponentTools();
    }
    getTools() {
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
    async execute(toolName, args) {
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
    validateNodeUuid(nodeUuid) {
        if (!nodeUuid || typeof nodeUuid !== 'string') {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'nodeUuid must be a non-empty string', { suggestion: 'Use get_all_nodes or find_node_by_name to obtain the UUID' });
        }
        // Cheap shape check so obvious garbage ("fake", "abc") is rejected as
        // INVALID_PARAMS instead of falling through to Editor.Message and being
        // packaged as EDITOR_API_ERROR (P2.C fix). Covers both standard UUID
        // (36 chars with dashes) and Cocos compressed form (base64-ish, 5+ chars).
        if (!/^[A-Za-z0-9+/=_\-]{8,}$/.test(nodeUuid)) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, `nodeUuid "${nodeUuid}" does not look like a valid Cocos UUID`, { suggestion: 'UUID must be at least 8 chars, alphanumeric + [+/=_-]. Use get_all_nodes or find_node_by_name to obtain a real UUID.' });
        }
        return null;
    }
    buildEntries(args, typeMap) {
        const entries = [];
        for (const key of Object.keys(typeMap)) {
            if (args[key] !== undefined) {
                entries.push({ property: key, propertyType: typeMap[key], value: args[key] });
            }
        }
        return entries;
    }
    async setLabel(args) {
        const invalid = this.validateNodeUuid(args.nodeUuid);
        if (invalid)
            return invalid;
        const entries = this.buildEntries(args, UITools.LABEL_TYPES);
        if (entries.length === 0) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'no Label fields supplied (all inputs undefined)', { suggestion: 'Provide at least one of: string, fontSize, color, isBold, ...' });
        }
        return await this.componentTools.execute('batch_set_properties', {
            nodeUuid: args.nodeUuid,
            componentType: 'cc.Label',
            properties: entries
        });
    }
    async setLayout(args) {
        const invalid = this.validateNodeUuid(args.nodeUuid);
        if (invalid)
            return invalid;
        const entries = this.buildEntries(args, UITools.LAYOUT_TYPES);
        if (entries.length === 0) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'no Layout fields supplied (all inputs undefined)', { suggestion: 'Provide at least one of: type, spacingX, paddingLeft, ...' });
        }
        return await this.componentTools.execute('batch_set_properties', {
            nodeUuid: args.nodeUuid,
            componentType: 'cc.Layout',
            properties: entries
        });
    }
    async setSprite(args) {
        const invalid = this.validateNodeUuid(args.nodeUuid);
        if (invalid)
            return invalid;
        const entries = this.buildEntries(args, UITools.SPRITE_TYPES);
        if (entries.length === 0) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'no Sprite fields supplied (all inputs undefined)', { suggestion: 'Provide at least one of: spriteFrame, sizeMode, type, color' });
        }
        return await this.componentTools.execute('batch_set_properties', {
            nodeUuid: args.nodeUuid,
            componentType: 'cc.Sprite',
            properties: entries
        });
    }
}
exports.UITools = UITools;
// Field → propertyType mapping for cc.Label
UITools.LABEL_TYPES = {
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
UITools.LAYOUT_TYPES = {
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
UITools.SPRITE_TYPES = {
    spriteFrame: 'spriteFrame',
    sizeMode: 'number',
    type: 'number',
    color: 'color'
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvdWktdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsdURBQW1EO0FBQ25ELDREQUEyRTtBQUUzRTs7Ozs7O0dBTUc7QUFDSCxNQUFhLE9BQU87SUFBcEI7UUFDWSxtQkFBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO0lBcU5sRCxDQUFDO0lBbk5HLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFdBQVcsRUFBRSxvTUFBb007Z0JBQ2pOLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsK0NBQStDLEVBQUU7d0JBQzFGLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRTt3QkFDdkQsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUU7d0JBQzNELFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRTt3QkFDMUQsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTt3QkFDM0IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTt3QkFDN0IsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTt3QkFDaEMsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxZQUFZOzRCQUN6QixVQUFVLEVBQUU7Z0NBQ1IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFD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QUFDcEIsbUJBQVcsR0FBMkI7SUFDMUQsTUFBTSxFQUFFLFFBQVE7SUFDaEIsUUFBUSxFQUFFLFFBQVE7SUFDbEIsVUFBVSxFQUFFLFFBQVE7SUFDcEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsUUFBUSxFQUFFLFNBQVM7SUFDbkIsV0FBVyxFQUFFLFNBQVM7SUFDdEIsS0FBSyxFQUFFLE9BQU87SUFDZCxlQUFlLEVBQUUsUUFBUTtJQUN6QixhQUFhLEVBQUUsUUFBUTtJQUN2QixRQUFRLEVBQUUsUUFBUTtDQUNyQixBQVhrQyxDQVdqQztBQUVGLG1FQUFtRTtBQUMzQyxvQkFBWSxHQUEyQjtJQUMzRCxJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRSxRQUFRO0lBQ3BCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLFdBQVcsRUFBRSxRQUFRO0lBQ3JCLFlBQVksRUFBRSxRQUFRO0lBQ3RCLFVBQVUsRUFBRSxRQUFRO0lBQ3BCLGFBQWEsRUFBRSxRQUFRO0lBQ3ZCLG1CQUFtQixFQUFFLFFBQVE7SUFDN0IsaUJBQWlCLEVBQUUsUUFBUTtDQUM5QixBQVhtQyxDQVdsQztBQUVGLDZDQUE2QztBQUNyQixvQkFBWSxHQUEyQjtJQUMzRCxXQUFXLEVBQUUsYUFBYTtJQUMxQixRQUFRLEVBQUUsUUFBUTtJQUNsQixJQUFJLEVBQUUsUUFBUTtJQUNkLEtBQUssRUFBRSxPQUFPO0NBQ2pCLEFBTG1DLENBS2xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBjcmVhdGVFcnJvclJlc3BvbnNlLCBFUlJPUl9DT0RFUyB9IGZyb20gJy4uL3V0aWxzL2Vycm9yLXJlc3BvbnNlJztcblxuLyoqXG4gKiBVSVRvb2xzIOKAlCBzZW1hbnRpYy1sYXllciBzaG9ydGN1dHMgdGhhdCBidWlsZCBhIGBjb21wb25lbnRfYmF0Y2hfc2V0X3Byb3BlcnRpZXNgXG4gKiBjYWxsIHVuZGVyIHRoZSBob29kLiBVc2VycyBzdXBwbHkgb25seSBDb2Nvcy1rbm93biBmaWVsZCBuYW1lczsgcHJvcGVydHlUeXBlIGlzXG4gKiBmaWxsZWQgaW4gYnkgdGhpcyBjbGFzcywgc28gQUkgZG9lc24ndCBoYXZlIHRvIHJlbWVtYmVyIGV2ZXJ5IHR5cGUgaGludC5cbiAqXG4gKiBVbmRlZmluZWQgaW5wdXRzIGFyZSBza2lwcGVkIChzbyBwYXJ0aWFsIHVwZGF0ZXMgd29yayBuYXR1cmFsbHkpLlxuICovXG5leHBvcnQgY2xhc3MgVUlUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBjb21wb25lbnRUb29scyA9IG5ldyBDb21wb25lbnRUb29scygpO1xuXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NldF9sYWJlbCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZW1hbnRpYyBzaG9ydGN1dCB0byB1cGRhdGUgYSBjYy5MYWJlbC4gSW50ZXJuYWxseSB3cmFwcyBjb21wb25lbnRfYmF0Y2hfc2V0X3Byb3BlcnRpZXM7IGV2ZXJ5IGZpZWxkIGlzIG9wdGlvbmFsIChvbWl0dGVkIGZpZWxkcyBhcmUgbm90IHRvdWNoZWQpLiBSZXF1aXJlcyBjYy5MYWJlbCBhbHJlYWR5IGF0dGFjaGVkIHRvIHRoZSBub2RlLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQgKG11c3QgYWxyZWFkeSBoYXZlIGNjLkxhYmVsKScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUZXh0IGNvbnRlbnQnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdGb250IHNpemUgKHB0KScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTGluZSBoZWlnaHQnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0JvbGQ6IHsgdHlwZTogJ2Jvb2xlYW4nIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0l0YWxpYzogeyB0eXBlOiAnYm9vbGVhbicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzVW5kZXJsaW5lOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JHQkEgMC0yNTUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogeyB0eXBlOiAnbnVtYmVyJyB9LCBnOiB7IHR5cGU6ICdudW1iZXInIH0sIGI6IHsgdHlwZTogJ251bWJlcicgfSwgYTogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6b250YWxBbGlnbjogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICcwPUxFRlQsIDE9Q0VOVEVSLCAyPVJJR0hUJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljYWxBbGlnbjogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICcwPVRPUCwgMT1DRU5URVIsIDI9Qk9UVE9NJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnMD1OT05FLCAxPUNMQU1QLCAyPVNIUklOSywgMz1SRVNJWkVfSEVJR0hUJyB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfbGF5b3V0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NlbWFudGljIHNob3J0Y3V0IHRvIHVwZGF0ZSBhIGNjLkxheW91dC4gSW50ZXJuYWxseSB3cmFwcyBjb21wb25lbnRfYmF0Y2hfc2V0X3Byb3BlcnRpZXMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRCAobXVzdCBhbHJlYWR5IGhhdmUgY2MuTGF5b3V0KScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnMD1OT05FLCAxPUhPUklaT05UQUwsIDI9VkVSVElDQUwsIDM9R1JJRCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc2l6ZU1vZGU6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnMD1OT05FLCAxPUNPTlRBSU5FUiwgMj1DSElMRFJFTicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNpbmdYOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjaW5nWTogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0xlZnQ6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdSaWdodDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1RvcDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0JvdHRvbTogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbERpcmVjdGlvbjogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICcwPUxFRlRfVE9fUklHSFQsIDE9UklHSFRfVE9fTEVGVCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsRGlyZWN0aW9uOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJzA9VE9QX1RPX0JPVFRPTSwgMT1CT1RUT01fVE9fVE9QJyB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfc3ByaXRlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NlbWFudGljIHNob3J0Y3V0IHRvIHVwZGF0ZSBhIGNjLlNwcml0ZS4gSW50ZXJuYWxseSB3cmFwcyBjb21wb25lbnRfYmF0Y2hfc2V0X3Byb3BlcnRpZXMuIFVzZSBzcHJpdGVGcmFtZSB0byBhc3NpZ24gYSBTcHJpdGVGcmFtZSBhc3NldCAoVVVJRCBvciBkYjovLyBVUkwgb2YgdGhlIHN1Yi1zcHJpdGUtZnJhbWUpLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQgKG11c3QgYWxyZWFkeSBoYXZlIGNjLlNwcml0ZSknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzcHJpdGVGcmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3ByaXRlRnJhbWUgVVVJRCBvciBkYjovLyBVUkwgKG9mIHRoZSBzcHJpdGUtZnJhbWUgc3ViLWFzc2V0LCBlLmcuIFwiZGI6Ly9hc3NldHMvaWNvbnMvYS5wbmcvYVwiKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplTW9kZTogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICcwPUNVU1RPTSwgMT1UUklNTUVELCAyPVJBVycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnMD1TSU1QTEUsIDE9U0xJQ0VELCAyPVRJTEVELCAzPUZJTExFRCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaW50IFJHQkEgMC0yNTUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogeyB0eXBlOiAnbnVtYmVyJyB9LCBnOiB7IHR5cGU6ICdudW1iZXInIH0sIGI6IHsgdHlwZTogJ251bWJlcicgfSwgYTogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnc2V0X2xhYmVsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRMYWJlbChhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9sYXlvdXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldExheW91dChhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9zcHJpdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldFNwcml0ZShhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlTm9kZVV1aWQobm9kZVV1aWQ6IGFueSk6IFRvb2xSZXNwb25zZSB8IG51bGwge1xuICAgICAgICBpZiAoIW5vZGVVdWlkIHx8IHR5cGVvZiBub2RlVXVpZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICdub2RlVXVpZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZycsXG4gICAgICAgICAgICAgICAgeyBzdWdnZXN0aW9uOiAnVXNlIGdldF9hbGxfbm9kZXMgb3IgZmluZF9ub2RlX2J5X25hbWUgdG8gb2J0YWluIHRoZSBVVUlEJyB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC8vIENoZWFwIHNoYXBlIGNoZWNrIHNvIG9idmlvdXMgZ2FyYmFnZSAoXCJmYWtlXCIsIFwiYWJjXCIpIGlzIHJlamVjdGVkIGFzXG4gICAgICAgIC8vIElOVkFMSURfUEFSQU1TIGluc3RlYWQgb2YgZmFsbGluZyB0aHJvdWdoIHRvIEVkaXRvci5NZXNzYWdlIGFuZCBiZWluZ1xuICAgICAgICAvLyBwYWNrYWdlZCBhcyBFRElUT1JfQVBJX0VSUk9SIChQMi5DIGZpeCkuIENvdmVycyBib3RoIHN0YW5kYXJkIFVVSURcbiAgICAgICAgLy8gKDM2IGNoYXJzIHdpdGggZGFzaGVzKSBhbmQgQ29jb3MgY29tcHJlc3NlZCBmb3JtIChiYXNlNjQtaXNoLCA1KyBjaGFycykuXG4gICAgICAgIGlmICghL15bQS1aYS16MC05Ky89X1xcLV17OCx9JC8udGVzdChub2RlVXVpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgIGBub2RlVXVpZCBcIiR7bm9kZVV1aWR9XCIgZG9lcyBub3QgbG9vayBsaWtlIGEgdmFsaWQgQ29jb3MgVVVJRGAsXG4gICAgICAgICAgICAgICAgeyBzdWdnZXN0aW9uOiAnVVVJRCBtdXN0IGJlIGF0IGxlYXN0IDggY2hhcnMsIGFscGhhbnVtZXJpYyArIFsrLz1fLV0uIFVzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIG9idGFpbiBhIHJlYWwgVVVJRC4nIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRmllbGQg4oaSIHByb3BlcnR5VHlwZSBtYXBwaW5nIGZvciBjYy5MYWJlbFxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IExBQkVMX1RZUEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICBzdHJpbmc6ICdzdHJpbmcnLFxuICAgICAgICBmb250U2l6ZTogJ251bWJlcicsXG4gICAgICAgIGxpbmVIZWlnaHQ6ICdudW1iZXInLFxuICAgICAgICBpc0JvbGQ6ICdib29sZWFuJyxcbiAgICAgICAgaXNJdGFsaWM6ICdib29sZWFuJyxcbiAgICAgICAgaXNVbmRlcmxpbmU6ICdib29sZWFuJyxcbiAgICAgICAgY29sb3I6ICdjb2xvcicsXG4gICAgICAgIGhvcml6b250YWxBbGlnbjogJ251bWJlcicsXG4gICAgICAgIHZlcnRpY2FsQWxpZ246ICdudW1iZXInLFxuICAgICAgICBvdmVyZmxvdzogJ251bWJlcidcbiAgICB9O1xuXG4gICAgLy8gRmllbGQg4oaSIHByb3BlcnR5VHlwZSBtYXBwaW5nIGZvciBjYy5MYXlvdXQgKGFsbCBudW1lcmljIG9yIGVudW0pXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTEFZT1VUX1RZUEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgcmVzaXplTW9kZTogJ251bWJlcicsXG4gICAgICAgIHNwYWNpbmdYOiAnbnVtYmVyJyxcbiAgICAgICAgc3BhY2luZ1k6ICdudW1iZXInLFxuICAgICAgICBwYWRkaW5nTGVmdDogJ251bWJlcicsXG4gICAgICAgIHBhZGRpbmdSaWdodDogJ251bWJlcicsXG4gICAgICAgIHBhZGRpbmdUb3A6ICdudW1iZXInLFxuICAgICAgICBwYWRkaW5nQm90dG9tOiAnbnVtYmVyJyxcbiAgICAgICAgaG9yaXpvbnRhbERpcmVjdGlvbjogJ251bWJlcicsXG4gICAgICAgIHZlcnRpY2FsRGlyZWN0aW9uOiAnbnVtYmVyJ1xuICAgIH07XG5cbiAgICAvLyBGaWVsZCDihpIgcHJvcGVydHlUeXBlIG1hcHBpbmcgZm9yIGNjLlNwcml0ZVxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFNQUklURV9UWVBFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgc3ByaXRlRnJhbWU6ICdzcHJpdGVGcmFtZScsXG4gICAgICAgIHNpemVNb2RlOiAnbnVtYmVyJyxcbiAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgIGNvbG9yOiAnY29sb3InXG4gICAgfTtcblxuICAgIHByaXZhdGUgYnVpbGRFbnRyaWVzKGFyZ3M6IGFueSwgdHlwZU1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IEFycmF5PHsgcHJvcGVydHk6IHN0cmluZzsgcHJvcGVydHlUeXBlOiBzdHJpbmc7IHZhbHVlOiBhbnkgfT4ge1xuICAgICAgICBjb25zdCBlbnRyaWVzOiBBcnJheTx7IHByb3BlcnR5OiBzdHJpbmc7IHByb3BlcnR5VHlwZTogc3RyaW5nOyB2YWx1ZTogYW55IH0+ID0gW107XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHR5cGVNYXApKSB7XG4gICAgICAgICAgICBpZiAoYXJnc1trZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goeyBwcm9wZXJ0eToga2V5LCBwcm9wZXJ0eVR5cGU6IHR5cGVNYXBba2V5XSwgdmFsdWU6IGFyZ3Nba2V5XSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW50cmllcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldExhYmVsKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGludmFsaWQgPSB0aGlzLnZhbGlkYXRlTm9kZVV1aWQoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgIGlmIChpbnZhbGlkKSByZXR1cm4gaW52YWxpZDtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHRoaXMuYnVpbGRFbnRyaWVzKGFyZ3MsIFVJVG9vbHMuTEFCRUxfVFlQRVMpO1xuICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICdubyBMYWJlbCBmaWVsZHMgc3VwcGxpZWQgKGFsbCBpbnB1dHMgdW5kZWZpbmVkKScsXG4gICAgICAgICAgICAgICAgeyBzdWdnZXN0aW9uOiAnUHJvdmlkZSBhdCBsZWFzdCBvbmUgb2Y6IHN0cmluZywgZm9udFNpemUsIGNvbG9yLCBpc0JvbGQsIC4uLicgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdiYXRjaF9zZXRfcHJvcGVydGllcycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiBhcmdzLm5vZGVVdWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLkxhYmVsJyxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IGVudHJpZXNcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRMYXlvdXQoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgaW52YWxpZCA9IHRoaXMudmFsaWRhdGVOb2RlVXVpZChhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgaWYgKGludmFsaWQpIHJldHVybiBpbnZhbGlkO1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gdGhpcy5idWlsZEVudHJpZXMoYXJncywgVUlUb29scy5MQVlPVVRfVFlQRVMpO1xuICAgICAgICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICdubyBMYXlvdXQgZmllbGRzIHN1cHBsaWVkIChhbGwgaW5wdXRzIHVuZGVmaW5lZCknLFxuICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ1Byb3ZpZGUgYXQgbGVhc3Qgb25lIG9mOiB0eXBlLCBzcGFjaW5nWCwgcGFkZGluZ0xlZnQsIC4uLicgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdiYXRjaF9zZXRfcHJvcGVydGllcycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiBhcmdzLm5vZGVVdWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLkxheW91dCcsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBlbnRyaWVzXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0U3ByaXRlKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGludmFsaWQgPSB0aGlzLnZhbGlkYXRlTm9kZVV1aWQoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgIGlmIChpbnZhbGlkKSByZXR1cm4gaW52YWxpZDtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHRoaXMuYnVpbGRFbnRyaWVzKGFyZ3MsIFVJVG9vbHMuU1BSSVRFX1RZUEVTKTtcbiAgICAgICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICAnbm8gU3ByaXRlIGZpZWxkcyBzdXBwbGllZCAoYWxsIGlucHV0cyB1bmRlZmluZWQpJyxcbiAgICAgICAgICAgICAgICB7IHN1Z2dlc3Rpb246ICdQcm92aWRlIGF0IGxlYXN0IG9uZSBvZjogc3ByaXRlRnJhbWUsIHNpemVNb2RlLCB0eXBlLCBjb2xvcicgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdiYXRjaF9zZXRfcHJvcGVydGllcycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiBhcmdzLm5vZGVVdWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLlNwcml0ZScsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBlbnRyaWVzXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==