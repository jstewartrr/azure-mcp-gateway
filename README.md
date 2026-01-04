# Azure MCP Gateway

Azure MCP Gateway deployed on Vercel providing Claude with Azure resource management capabilities.

## Tools Available

- `azure_list_resource_groups` - List all resource groups
- `azure_list_vms` - List virtual machines in a resource group
- `azure_list_container_apps` - List container instances
- `azure_get_container_logs` - Get container logs
- `azure_restart_container` - Restart a container group

## Environment Variables Required

- AZURE_TENANT_ID
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET
- AZURE_SUBSCRIPTION_ID

## Deployment

Deployed to Vercel at: https://azure-mcp-gateway.vercel.app

## Usage

```bash
curl https://azure-mcp-gateway.vercel.app/api/mcp
```

