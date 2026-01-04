export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.json({
      name: 'azure-mcp-gateway',
      version: '1.0.0',
      status: 'healthy',
      message: 'Azure MCP Gateway is running on Vercel'
    });
  }
  
  const body = req.body || {};
  
  if (body.method === 'tools/list') {
    return res.json({
      tools: [
        {
          name: 'azure_status',
          description: 'Check Azure MCP Gateway status',
          inputSchema: { type: 'object', properties: {}, required: [] }
        }
      ]
    });
  }
  
  if (body.method === 'tools/call') {
    return res.json({
      content: [{
        type: 'text',
        text: 'Azure MCP Gateway is operational. Full Azure SDK integration pending credentials.'
      }]
    });
  }
  
  return res.status(400).json({ error: 'Invalid request' });
}

