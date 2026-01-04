// Azure MCP Gateway - Vercel Serverless Function
const { ResourceManagementClient } = require('@azure/arm-resources');
const { ComputeManagementClient } = require('@azure/arm-compute');
const { ContainerInstanceManagementClient } = require('@azure/arm-containerinstance');
const { StorageManagementClient } = require('@azure/arm-storage');
const { ClientSecretCredential } = require('@azure/identity');

const ALLOWED_ORIGINS = [
  'https://claude.ai',
  'https://sm-gateway-a.jstewart-12a.workers.dev',
  'https://sm-gateway-c.jstewart-12a.workers.dev'
];

// Initialize Azure clients
function getAzureClients() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );
  
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  
  return {
    resources: new ResourceManagementClient(credential, subscriptionId),
    compute: new ComputeManagementClient(credential, subscriptionId),
    containers: new ContainerInstanceManagementClient(credential, subscriptionId),
    storage: new StorageManagementClient(credential, subscriptionId)
  };
}

// MCP Tool Definitions
const MCP_TOOLS = [
  {
    name: 'azure_list_resource_groups',
    description: 'List all resource groups in the subscription',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'azure_list_vms',
    description: 'List virtual machines in a resource group',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' }
      },
      required: ['resourceGroup']
    }
  },
  {
    name: 'azure_list_container_apps',
    description: 'List container instances in a resource group',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' }
      },
      required: ['resourceGroup']
    }
  },
  {
    name: 'azure_get_container_logs',
    description: 'Get logs from a container instance',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        containerGroup: { type: 'string', description: 'Container group name' },
        containerName: { type: 'string', description: 'Container name' }
      },
      required: ['resourceGroup', 'containerGroup', 'containerName']
    }
  },
  {
    name: 'azure_restart_container',
    description: 'Restart a container group',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        containerGroup: { type: 'string', description: 'Container group name' }
      },
      required: ['resourceGroup', 'containerGroup']
    }
  }
];

// Execute Azure operations
async function executeAzureTool(toolName, args) {
  const clients = getAzureClients();
  
  try {
    switch (toolName) {
      case 'azure_list_resource_groups': {
        const groups = [];
        for await (const group of clients.resources.resourceGroups.list()) {
          groups.push({
            name: group.name,
            location: group.location,
            id: group.id
          });
        }
        return { content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }] };
      }
      
      case 'azure_list_vms': {
        const vms = [];
        for await (const vm of clients.compute.virtualMachines.list(args.resourceGroup)) {
          vms.push({
            name: vm.name,
            location: vm.location,
            vmSize: vm.hardwareProfile?.vmSize,
            provisioningState: vm.provisioningState
          });
        }
        return { content: [{ type: 'text', text: JSON.stringify(vms, null, 2) }] };
      }
      
      case 'azure_list_container_apps': {
        const containers = [];
        for await (const container of clients.containers.containerGroups.listByResourceGroup(args.resourceGroup)) {
          containers.push({
            name: container.name,
            location: container.location,
            provisioningState: container.provisioningState,
            containers: container.containers?.map(c => ({
              name: c.name,
              image: c.image
            }))
          });
        }
        return { content: [{ type: 'text', text: JSON.stringify(containers, null, 2) }] };
      }
      
      case 'azure_get_container_logs': {
        const logs = await clients.containers.containers.listLogs(
          args.resourceGroup,
          args.containerGroup,
          args.containerName
        );
        return { content: [{ type: 'text', text: logs.content || 'No logs available' }] };
      }
      
      case 'azure_restart_container': {
        await clients.containers.containerGroups.restart(
          args.resourceGroup,
          args.containerGroup
        );
        return { content: [{ type: 'text', text: `Container group ${args.containerGroup} restarted successfully` }] };
      }
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
}

// Main handler
module.exports = async (req, res) => {
  // CORS
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigin = ALLOWED_ORIGINS.find(allowed => origin?.includes(allowed));
  
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle MCP protocol
  const body = req.body || {};
  
  try {
    if (body.method === 'tools/list') {
      return res.json({
        tools: MCP_TOOLS
      });
    }
    
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      const result = await executeAzureTool(name, args || {});
      return res.json(result);
    }
    
    if (req.method === 'GET') {
      return res.json({
        name: 'azure-mcp-gateway',
        version: '1.0.0',
        status: 'healthy',
        tools: MCP_TOOLS.length
      });
    }
    
    return res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

