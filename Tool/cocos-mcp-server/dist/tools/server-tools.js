"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerTools = void 0;
class ServerTools {
    getTools() {
        return [
            {
                name: 'query_server_ip_list',
                description: 'Query server IP list',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_sorted_server_ip_list',
                description: 'Get sorted server IP list',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_server_port',
                description: 'Query editor server current port',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_server_status',
                description: 'Get comprehensive server status information',
                // Per-tool scope override: even though `server` category defaults to
                // 'rare', get_server_status is a legitimate health-check entry point
                // and must stay loaded when settings.disabledScopes excludes the rare
                // category. (Phase 2 P2.E fix.)
                scope: 'core',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'check_server_connectivity',
                description: 'Check server connectivity and network status',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeout: {
                            type: 'number',
                            description: 'Timeout in milliseconds',
                            default: 5000
                        }
                    }
                }
            },
            {
                name: 'get_network_interfaces',
                description: 'Get available network interfaces',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'query_server_ip_list':
                return await this.queryServerIPList();
            case 'query_sorted_server_ip_list':
                return await this.querySortedServerIPList();
            case 'query_server_port':
                return await this.queryServerPort();
            case 'get_server_status':
                return await this.getServerStatus();
            case 'check_server_connectivity':
                return await this.checkServerConnectivity(args.timeout);
            case 'get_network_interfaces':
                return await this.getNetworkInterfaces();
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async queryServerIPList() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-ip-list').then((ipList) => {
                resolve({
                    success: true,
                    data: {
                        ipList: ipList,
                        count: ipList.length,
                        message: 'IP list retrieved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySortedServerIPList() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-sort-ip-list').then((sortedIPList) => {
                resolve({
                    success: true,
                    data: {
                        sortedIPList: sortedIPList,
                        count: sortedIPList.length,
                        message: 'Sorted IP list retrieved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryServerPort() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-port').then((port) => {
                resolve({
                    success: true,
                    data: {
                        port: port,
                        message: `Editor server is running on port ${port}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getServerStatus() {
        return new Promise(async (resolve) => {
            var _a;
            try {
                // Gather comprehensive server information
                const [ipListResult, portResult] = await Promise.allSettled([
                    this.queryServerIPList(),
                    this.queryServerPort()
                ]);
                const status = {
                    timestamp: new Date().toISOString(),
                    serverRunning: true
                };
                if (ipListResult.status === 'fulfilled' && ipListResult.value.success) {
                    status.availableIPs = ipListResult.value.data.ipList;
                    status.ipCount = ipListResult.value.data.count;
                }
                else {
                    status.availableIPs = [];
                    status.ipCount = 0;
                    status.ipError = ipListResult.status === 'rejected' ? ipListResult.reason : ipListResult.value.error;
                }
                if (portResult.status === 'fulfilled' && portResult.value.success) {
                    status.port = portResult.value.data.port;
                }
                else {
                    status.port = null;
                    status.portError = portResult.status === 'rejected' ? portResult.reason : portResult.value.error;
                }
                // Add additional server info
                status.mcpServerPort = 3000; // Our MCP server port
                status.editorVersion = ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.cocos) || 'Unknown';
                status.platform = process.platform;
                status.nodeVersion = process.version;
                resolve({
                    success: true,
                    data: status
                });
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to get server status: ${err.message}`
                });
            }
        });
    }
    async checkServerConnectivity(timeout = 5000) {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                // Test basic Editor API connectivity
                const testPromise = Editor.Message.request('server', 'query-port');
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), timeout);
                });
                await Promise.race([testPromise, timeoutPromise]);
                const responseTime = Date.now() - startTime;
                resolve({
                    success: true,
                    data: {
                        connected: true,
                        responseTime: responseTime,
                        timeout: timeout,
                        message: `Server connectivity confirmed in ${responseTime}ms`
                    }
                });
            }
            catch (err) {
                const responseTime = Date.now() - startTime;
                resolve({
                    success: false,
                    data: {
                        connected: false,
                        responseTime: responseTime,
                        timeout: timeout,
                        error: err.message
                    }
                });
            }
        });
    }
    async getNetworkInterfaces() {
        return new Promise(async (resolve) => {
            try {
                // Get network interfaces using Node.js os module
                const os = require('os');
                const interfaces = os.networkInterfaces();
                const networkInfo = Object.entries(interfaces).map(([name, addresses]) => ({
                    name: name,
                    addresses: addresses.map((addr) => ({
                        address: addr.address,
                        family: addr.family,
                        internal: addr.internal,
                        cidr: addr.cidr
                    }))
                }));
                // Also try to get server IPs for comparison
                const serverIPResult = await this.queryServerIPList();
                resolve({
                    success: true,
                    data: {
                        networkInterfaces: networkInfo,
                        serverAvailableIPs: serverIPResult.success ? serverIPResult.data.ipList : [],
                        message: 'Network interfaces retrieved successfully'
                    }
                });
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to get network interfaces: ${err.message}`
                });
            }
        });
    }
}
exports.ServerTools = ServerTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlcnZlci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLFdBQVc7SUFDcEIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsc0JBQXNCO2dCQUM1QixXQUFXLEVBQUUsc0JBQXNCO2dCQUNuQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEVBQUU7aUJBQ2pCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsNkJBQTZCO2dCQUNuQyxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEVBQUU7aUJBQ2pCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixXQUFXLEVBQUUsa0NBQWtDO2dCQUMvQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEVBQUU7aUJBQ2pCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixXQUFXLEVBQUUsNkNBQTZDO2dCQUMxRCxxRUFBcUU7Z0JBQ3JFLHFFQUFxRTtnQkFDckUsc0VBQXNFO2dCQUN0RSxnQ0FBZ0M7Z0JBQ2hDLEtBQUssRUFBRSxNQUFNO2dCQUNiLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsRUFBRTtpQkFDakI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSwyQkFBMkI7Z0JBQ2pDLFdBQVcsRUFBRSw4Q0FBOEM7Z0JBQzNELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsT0FBTyxFQUFFOzRCQUNMLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5QkFBeUI7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QUVKLDRDQUE0QztnQkFDNUMsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFFdEQsT0FBTyxDQUFDO29CQUNKLE9BQU8sRUFBRSxJQUFJO29CQUNiLElBQUksRUFBRTt3QkFDRixpQkFBaUIsRUFBRSxXQUFXO3dCQUM5QixrQkFBa0IsRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDNUUsT0FBTyxFQUFFLDJDQUEyQztxQkFDdkQ7aUJBQ0osQ0FBQyxDQUFDO1lBRVAsQ0FBQztZQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQztvQkFDSixPQUFPLEVBQUUsS0FBSztvQkFDZCxLQUFLLEVBQUUscUNBQXFDLEdBQUcsQ0FBQyxPQUFPLEVBQUU7aUJBQzVELENBQUMsQ0FBQztZQUNQLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQXRRRCxrQ0FzUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X3NlcnZlcl9pcF9saXN0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHNlcnZlciBJUCBsaXN0JyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeV9zb3J0ZWRfc2VydmVyX2lwX2xpc3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IHNvcnRlZCBzZXJ2ZXIgSVAgbGlzdCcsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfc2VydmVyX3BvcnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgZWRpdG9yIHNlcnZlciBjdXJyZW50IHBvcnQnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7fVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9zZXJ2ZXJfc3RhdHVzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBjb21wcmVoZW5zaXZlIHNlcnZlciBzdGF0dXMgaW5mb3JtYXRpb24nLFxuICAgICAgICAgICAgICAgIC8vIFBlci10b29sIHNjb3BlIG92ZXJyaWRlOiBldmVuIHRob3VnaCBgc2VydmVyYCBjYXRlZ29yeSBkZWZhdWx0cyB0b1xuICAgICAgICAgICAgICAgIC8vICdyYXJlJywgZ2V0X3NlcnZlcl9zdGF0dXMgaXMgYSBsZWdpdGltYXRlIGhlYWx0aC1jaGVjayBlbnRyeSBwb2ludFxuICAgICAgICAgICAgICAgIC8vIGFuZCBtdXN0IHN0YXkgbG9hZGVkIHdoZW4gc2V0dGluZ3MuZGlzYWJsZWRTY29wZXMgZXhjbHVkZXMgdGhlIHJhcmVcbiAgICAgICAgICAgICAgICAvLyBjYXRlZ29yeS4gKFBoYXNlIDIgUDIuRSBmaXguKVxuICAgICAgICAgICAgICAgIHNjb3BlOiAnY29yZScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY2hlY2tfc2VydmVyX2Nvbm5lY3Rpdml0eScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGVjayBzZXJ2ZXIgY29ubmVjdGl2aXR5IGFuZCBuZXR3b3JrIHN0YXR1cycsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RpbWVvdXQgaW4gbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MDAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdnZXRfbmV0d29ya19pbnRlcmZhY2VzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBhdmFpbGFibGUgbmV0d29yayBpbnRlcmZhY2VzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9zZXJ2ZXJfaXBfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3NvcnRlZF9zZXJ2ZXJfaXBfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTb3J0ZWRTZXJ2ZXJJUExpc3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3NlcnZlcl9wb3J0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNlcnZlclBvcnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9zZXJ2ZXJfc3RhdHVzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRTZXJ2ZXJTdGF0dXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrX3NlcnZlcl9jb25uZWN0aXZpdHknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KGFyZ3MudGltZW91dCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfbmV0d29ya19pbnRlcmZhY2VzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXROZXR3b3JrSW50ZXJmYWNlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTZXJ2ZXJJUExpc3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzZXJ2ZXInLCAncXVlcnktaXAtbGlzdCcpLnRoZW4oKGlwTGlzdDogc3RyaW5nW10pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXBMaXN0OiBpcExpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogaXBMaXN0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdJUCBsaXN0IHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNvcnRlZFNlcnZlcklQTGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1zb3J0LWlwLWxpc3QnKS50aGVuKChzb3J0ZWRJUExpc3Q6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvcnRlZElQTGlzdDogc29ydGVkSVBMaXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IHNvcnRlZElQTGlzdC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU29ydGVkIElQIGxpc3QgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2VydmVyUG9ydCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1wb3J0JykudGhlbigocG9ydDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRWRpdG9yIHNlcnZlciBpcyBydW5uaW5nIG9uIHBvcnQgJHtwb3J0fWBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFNlcnZlclN0YXR1cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gR2F0aGVyIGNvbXByZWhlbnNpdmUgc2VydmVyIGluZm9ybWF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgW2lwTGlzdFJlc3VsdCwgcG9ydFJlc3VsdF0gPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5U2VydmVySVBMaXN0KCksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucXVlcnlTZXJ2ZXJQb3J0KClcbiAgICAgICAgICAgICAgICBdKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1czogYW55ID0ge1xuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgc2VydmVyUnVubmluZzogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAoaXBMaXN0UmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgaXBMaXN0UmVzdWx0LnZhbHVlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmF2YWlsYWJsZUlQcyA9IGlwTGlzdFJlc3VsdC52YWx1ZS5kYXRhLmlwTGlzdDtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmlwQ291bnQgPSBpcExpc3RSZXN1bHQudmFsdWUuZGF0YS5jb3VudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuYXZhaWxhYmxlSVBzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5pcENvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmlwRXJyb3IgPSBpcExpc3RSZXN1bHQuc3RhdHVzID09PSAncmVqZWN0ZWQnID8gaXBMaXN0UmVzdWx0LnJlYXNvbiA6IGlwTGlzdFJlc3VsdC52YWx1ZS5lcnJvcjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocG9ydFJlc3VsdC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnICYmIHBvcnRSZXN1bHQudmFsdWUuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMucG9ydCA9IHBvcnRSZXN1bHQudmFsdWUuZGF0YS5wb3J0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5wb3J0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLnBvcnRFcnJvciA9IHBvcnRSZXN1bHQuc3RhdHVzID09PSAncmVqZWN0ZWQnID8gcG9ydFJlc3VsdC5yZWFzb24gOiBwb3J0UmVzdWx0LnZhbHVlLmVycm9yO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIHNlcnZlciBpbmZvXG4gICAgICAgICAgICAgICAgc3RhdHVzLm1jcFNlcnZlclBvcnQgPSAzMDAwOyAvLyBPdXIgTUNQIHNlcnZlciBwb3J0XG4gICAgICAgICAgICAgICAgc3RhdHVzLmVkaXRvclZlcnNpb24gPSAoRWRpdG9yIGFzIGFueSkudmVyc2lvbnM/LmNvY29zIHx8ICdVbmtub3duJztcbiAgICAgICAgICAgICAgICBzdGF0dXMucGxhdGZvcm0gPSBwcm9jZXNzLnBsYXRmb3JtO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5ub2RlVmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvbjtcblxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBzdGF0dXNcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBzZXJ2ZXIgc3RhdHVzOiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja1NlcnZlckNvbm5lY3Rpdml0eSh0aW1lb3V0OiBudW1iZXIgPSA1MDAwKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFRlc3QgYmFzaWMgRWRpdG9yIEFQSSBjb25uZWN0aXZpdHlcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0UHJvbWlzZSA9IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1wb3J0Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignQ29ubmVjdGlvbiB0aW1lb3V0JykpLCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGF3YWl0IFByb21pc2UucmFjZShbdGVzdFByb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VUaW1lOiByZXNwb25zZVRpbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB0aW1lb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNlcnZlciBjb25uZWN0aXZpdHkgY29uZmlybWVkIGluICR7cmVzcG9uc2VUaW1lfW1zYFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVRpbWU6IHJlc3BvbnNlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHRpbWVvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldE5ldHdvcmtJbnRlcmZhY2VzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgbmV0d29yayBpbnRlcmZhY2VzIHVzaW5nIE5vZGUuanMgb3MgbW9kdWxlXG4gICAgICAgICAgICAgICAgY29uc3Qgb3MgPSByZXF1aXJlKCdvcycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZXMgPSBvcy5uZXR3b3JrSW50ZXJmYWNlcygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmtJbmZvID0gT2JqZWN0LmVudHJpZXMoaW50ZXJmYWNlcykubWFwKChbbmFtZSwgYWRkcmVzc2VzXTogW3N0cmluZywgYW55XSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzc2VzOiBhZGRyZXNzZXMubWFwKChhZGRyOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzOiBhZGRyLmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBmYW1pbHk6IGFkZHIuZmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJuYWw6IGFkZHIuaW50ZXJuYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaWRyOiBhZGRyLmNpZHJcbiAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWxzbyB0cnkgdG8gZ2V0IHNlcnZlciBJUHMgZm9yIGNvbXBhcmlzb25cbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJJUFJlc3VsdCA9IGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV0d29ya0ludGVyZmFjZXM6IG5ldHdvcmtJbmZvLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyQXZhaWxhYmxlSVBzOiBzZXJ2ZXJJUFJlc3VsdC5zdWNjZXNzID8gc2VydmVySVBSZXN1bHQuZGF0YS5pcExpc3QgOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdOZXR3b3JrIGludGVyZmFjZXMgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gZ2V0IG5ldHdvcmsgaW50ZXJmYWNlczogJHtlcnIubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=