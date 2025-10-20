# API + AI Integration Workflows

Complete guide to automation workflows combining the CollabCanvas API with AI agent capabilities.

---

## Overview

This guide demonstrates how to create powerful automation workflows by combining:
- **REST API**: Direct canvas and object manipulation
- **AI Agent**: Natural language processing and intelligent design generation
- **External Systems**: Integration with other tools and data sources

---

## Table of Contents

- [Data Visualization Workflows](#data-visualization-workflows)
- [Content Generation Workflows](#content-generation-workflows)
- [Design Automation Workflows](#design-automation-workflows)
- [Integration Workflows](#integration-workflows)
- [Monitoring and Analytics Workflows](#monitoring-and-analytics-workflows)
- [Advanced Automation Patterns](#advanced-automation-patterns)

---

## Data Visualization Workflows

### 1. Automated Chart Generation

Transform data into visual charts using API + AI coordination.

```javascript
class ChartGenerator {
  constructor(apiToken, canvasId) {
    this.client = new CollabCanvasClient(apiToken);
    this.canvasId = canvasId;
    this.baseUrl = 'https://your-project.web.app/api';
  }

  async createChart(data, chartType = 'bar') {
    // Step 1: Clear existing content (optional)
    await this.clearCanvas();

    // Step 2: Analyze data and determine layout
    const analysis = this.analyzeData(data);

    // Step 3: Use AI to create base chart structure
    const aiResponse = await this.requestAIChart(data, chartType, analysis);

    // Step 4: Use API for precise positioning and styling
    const refinedChart = await this.refineChart(aiResponse.actions);

    // Step 5: Add labels and annotations
    await this.addChartLabels(data, analysis);

    return refinedChart;
  }

  async requestAIChart(data, chartType, analysis) {
    const prompt = `Create a ${chartType} chart with ${data.length} data points. 
                   Values: ${data.map(d => d.value).join(', ')}. 
                   Max value: ${analysis.max}, Min value: ${analysis.min}. 
                   Use ${analysis.suggestedHeight}px height and different colors for each bar.
                   Place at position (50, 50).`;

    const response = await fetch(`${this.baseUrl}/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canvasId: this.canvasId,
        prompt: prompt,
        context: { includeObjects: false }
      })
    });

    return await response.json();
  }

  async refineChart(aiActions) {
    // Use API for precise measurements and positioning
    const updates = [];
    
    aiActions.forEach((action, index) => {
      if (action.type === 'create_object' && action.object.type === 'rectangle') {
        // Ensure consistent spacing and alignment
        updates.push({
          id: action.result.id,
          x: 50 + (index * 80), // Consistent 80px spacing
          width: 60, // Consistent width
          stroke: '#333333',
          strokeWidth: 1
        });
      }
    });

    if (updates.length > 0) {
      return await this.client.updateObjectsBatch(updates);
    }
  }

  async addChartLabels(data, analysis) {
    const labels = data.map((item, index) => ({
      type: 'text',
      x: 50 + (index * 80) + 30, // Center under each bar
      y: analysis.suggestedHeight + 100,
      text: item.label,
      fontSize: 12,
      fill: '#333333',
      fontFamily: 'Arial'
    }));

    return await this.client.createObjectsBatch(this.canvasId, labels);
  }

  analyzeData(data) {
    const values = data.map(d => d.value);
    return {
      max: Math.max(...values),
      min: Math.min(...values),
      suggestedHeight: Math.max(200, Math.max(...values) * 2),
      suggestedWidth: data.length * 80 + 100
    };
  }

  async clearCanvas() {
    const objects = await this.client.listObjects(this.canvasId);
    if (objects.objects.length > 0) {
      const ids = objects.objects.map(obj => obj.id);
      await this.client.deleteObjectsBatch(ids);
    }
  }
}

// Usage
const generator = new ChartGenerator('your_token', 'canvas_123');
const salesData = [
  { label: 'Jan', value: 1500 },
  { label: 'Feb', value: 2300 },
  { label: 'Mar', value: 1800 },
  { label: 'Apr', value: 2800 },
  { label: 'May', value: 3200 }
];

await generator.createChart(salesData, 'bar');
```

### 2. Real-time Dashboard Updates

Create dashboards that update automatically from external data sources.

```javascript
class DashboardUpdater {
  constructor(apiToken, canvasId, dataSource) {
    this.client = new CollabCanvasClient(apiToken);
    this.canvasId = canvasId;
    this.dataSource = dataSource;
    this.updateInterval = null;
  }

  async initialize() {
    // Create initial dashboard layout
    await this.createDashboardLayout();
    
    // Start real-time updates
    this.startRealTimeUpdates();
  }

  async createDashboardLayout() {
    const layoutPrompt = `Create a dashboard layout with:
    - Title "Sales Dashboard" at top
    - 3 metric cards in a row showing placeholder values
    - Large chart area below
    - Footer with last updated timestamp`;

    const response = await fetch(`${this.baseUrl}/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canvasId: this.canvasId,
        prompt: layoutPrompt
      })
    });

    return await response.json();
  }

  startRealTimeUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        const newData = await this.dataSource.fetchLatest();
        await this.updateDashboard(newData);
      } catch (error) {
        console.error('Dashboard update failed:', error);
      }
    }, 30000); // Update every 30 seconds
  }

  async updateDashboard(data) {
    // Update metric cards
    await this.updateMetricCards(data.metrics);
    
    // Update chart
    await this.updateChart(data.chartData);
    
    // Update timestamp
    await this.updateTimestamp();
  }

  async updateMetricCards(metrics) {
    const objects = await this.client.listObjects(this.canvasId);
    const metricTexts = objects.objects.filter(obj => 
      obj.type === 'text' && obj.text.includes('$')
    );

    const updates = metricTexts.map((obj, index) => ({
      id: obj.id,
      text: `$${metrics[index]?.value || '0'}`
    }));

    if (updates.length > 0) {
      await this.client.updateObjectsBatch(updates);
    }
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
```

---

## Content Generation Workflows

### 3. Template-Based Content Creation

Generate multiple designs from templates and data.

```javascript
class TemplateGenerator {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
  }

  async generateFromTemplate(templateData, variations) {
    const results = [];

    for (const variation of variations) {
      // Create new canvas for each variation
      const canvas = await this.client.createCanvas(
        `${templateData.name} - ${variation.name}`
      );

      // Generate content using AI
      const content = await this.generateContent(canvas.id, templateData, variation);
      
      // Refine with API calls
      const refined = await this.refineContent(canvas.id, content);
      
      results.push({
        canvasId: canvas.id,
        variation: variation.name,
        objects: refined
      });
    }

    return results;
  }

  async generateContent(canvasId, template, variation) {
    const prompt = `Create a ${template.type} design with:
    - Title: "${variation.title}"
    - Color scheme: ${variation.colors.join(', ')}
    - Style: ${variation.style}
    - Elements: ${template.elements.join(', ')}
    Layout should be ${template.layout}`;

    const response = await fetch(`${this.baseUrl}/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canvasId: canvasId,
        prompt: prompt
      })
    });

    return await response.json();
  }
}

// Usage
const generator = new TemplateGenerator('your_token');

const template = {
  name: 'Social Media Post',
  type: 'social media post',
  layout: 'centered with large title',
  elements: ['title', 'subtitle', 'call-to-action button', 'decorative elements']
};

const variations = [
  {
    name: 'Summer Sale',
    title: 'Summer Sale - 50% Off',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    style: 'bright and energetic'
  },
  {
    name: 'Black Friday',
    title: 'Black Friday Deals',
    colors: ['#2C3E50', '#E74C3C', '#F39C12'],
    style: 'bold and urgent'
  }
];

const results = await generator.generateFromTemplate(template, variations);
```

---

## Design Automation Workflows

### 4. Style System Automation

Maintain consistent design systems across multiple canvases.

```javascript
class StyleSystemManager {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
    this.styleGuide = null;
  }

  async loadStyleGuide(styleGuideCanvas) {
    // Extract style guide from reference canvas
    const snapshot = await this.client.getCanvasSnapshot(styleGuideCanvas);
    
    this.styleGuide = {
      colors: this.extractColors(snapshot.objects),
      typography: this.extractTypography(snapshot.objects),
      spacing: this.extractSpacing(snapshot.objects),
      shapes: this.extractShapeStyles(snapshot.objects)
    };
  }

  async applyStyleGuide(canvasId) {
    const objects = await this.client.listObjects(canvasId);
    const updates = [];

    for (const obj of objects.objects) {
      const styleUpdate = this.generateStyleUpdate(obj);
      if (styleUpdate) {
        updates.push({ id: obj.id, ...styleUpdate });
      }
    }

    if (updates.length > 0) {
      await this.client.updateObjectsBatch(updates);
    }
  }

  generateStyleUpdate(obj) {
    switch (obj.type) {
      case 'text':
        return {
          fontFamily: this.styleGuide.typography.primary.fontFamily,
          fontSize: this.getFontSize(obj.text),
          fill: this.styleGuide.colors.text
        };
      
      case 'rectangle':
        return {
          fill: this.styleGuide.colors.primary,
          stroke: this.styleGuide.colors.border,
          strokeWidth: this.styleGuide.shapes.strokeWidth
        };
      
      default:
        return null;
    }
  }

  async validateDesign(canvasId) {
    const objects = await this.client.listObjects(canvasId);
    const violations = [];

    for (const obj of objects.objects) {
      const issues = this.checkStyleCompliance(obj);
      if (issues.length > 0) {
        violations.push({ objectId: obj.id, issues });
      }
    }

    return violations;
  }
}

// Usage
const styleManager = new StyleSystemManager('your_token');
await styleManager.loadStyleGuide('style_guide_canvas_id');

// Apply styles to multiple canvases
const canvasIds = ['canvas_1', 'canvas_2', 'canvas_3'];
for (const canvasId of canvasIds) {
  await styleManager.applyStyleGuide(canvasId);
  const violations = await styleManager.validateDesign(canvasId);
  console.log(`Canvas ${canvasId}: ${violations.length} style violations`);
}
```

---

## Integration Workflows

### 5. External Tool Integration

Connect CollabCanvas with other design and business tools.

```javascript
class IntegrationHub {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
    this.integrations = new Map();
  }

  // Slack Integration
  async setupSlackNotifications(webhookUrl) {
    this.integrations.set('slack', {
      webhook: webhookUrl,
      notify: async (message) => {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        });
      }
    });
  }

  // Airtable Integration
  async setupAirtableSync(apiKey, baseId, tableId) {
    this.integrations.set('airtable', {
      apiKey,
      baseId,
      tableId,
      fetchRecords: async () => {
        const response = await fetch(
          `https://api.airtable.com/v0/${baseId}/${tableId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        return await response.json();
      }
    });
  }

  // Google Sheets Integration
  async setupGoogleSheets(credentials, spreadsheetId) {
    this.integrations.set('sheets', {
      credentials,
      spreadsheetId,
      fetchData: async (range) => {
        // Implementation depends on Google Sheets API setup
        // This is a simplified example
        const response = await this.googleSheetsAPI.get({
          spreadsheetId,
          range
        });
        return response.data.values;
      }
    });
  }

  async syncFromAirtable(canvasId, mapping) {
    const airtable = this.integrations.get('airtable');
    if (!airtable) throw new Error('Airtable not configured');

    const records = await airtable.fetchRecords();
    
    // Convert records to canvas objects based on mapping
    const objects = records.records.map((record, index) => ({
      type: mapping.objectType,
      x: mapping.startX + (index * mapping.spacing),
      y: mapping.startY,
      ...this.mapRecordToObject(record.fields, mapping)
    }));

    const result = await this.client.createObjectsBatch(canvasId, objects);
    
    // Notify Slack
    const slack = this.integrations.get('slack');
    if (slack) {
      await slack.notify(
        `📊 Synced ${objects.length} records from Airtable to canvas ${canvasId}`
      );
    }

    return result;
  }

  mapRecordToObject(fields, mapping) {
    const mapped = {};
    
    for (const [fieldName, canvasProperty] of Object.entries(mapping.fieldMap)) {
      if (fields[fieldName]) {
        mapped[canvasProperty] = fields[fieldName];
      }
    }

    return mapped;
  }
}

// Usage
const hub = new IntegrationHub('your_token');

// Setup integrations
await hub.setupSlackNotifications('https://hooks.slack.com/...');
await hub.setupAirtableSync('airtable_api_key', 'base_id', 'table_id');

// Sync data
const mapping = {
  objectType: 'rectangle',
  startX: 50,
  startY: 50,
  spacing: 100,
  fieldMap: {
    'Name': 'text',
    'Priority': 'fill',
    'Status': 'stroke'
  }
};

await hub.syncFromAirtable('canvas_123', mapping);
```

---

## Monitoring and Analytics Workflows

### 6. Usage Analytics and Reporting

Track canvas usage and generate reports.

```javascript
class AnalyticsWorkflow {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
  }

  async generateUsageReport(canvasIds, period = '7d') {
    const reports = [];

    for (const canvasId of canvasIds) {
      const canvas = await this.client.getCanvas(canvasId);
      const snapshot = await this.client.getCanvasSnapshot(canvasId);
      
      const analysis = {
        canvasId,
        name: canvas.name,
        objectCount: snapshot.objectCount,
        lastModified: canvas.updatedAt,
        collaborators: canvas.collaborators.length,
        objectTypes: this.analyzeObjectTypes(snapshot.objects),
        complexity: this.calculateComplexity(snapshot.objects)
      };

      reports.push(analysis);
    }

    // Generate visual report
    await this.createVisualReport(reports);
    
    return reports;
  }

  async createVisualReport(reports) {
    // Create a new canvas for the report
    const reportCanvas = await this.client.createCanvas('Usage Report');
    
    // Use AI to create report layout
    const prompt = `Create a usage report layout with:
    - Title "Canvas Usage Report"
    - Summary statistics: ${reports.length} canvases analyzed
    - Bar chart showing object counts per canvas
    - Table showing canvas names and stats`;

    const aiResponse = await fetch(`${this.baseUrl}/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canvasId: reportCanvas.id,
        prompt: prompt
      })
    });

    // Add detailed data
    await this.addReportData(reportCanvas.id, reports);
    
    return reportCanvas;
  }

  analyzeObjectTypes(objects) {
    const types = {};
    objects.forEach(obj => {
      types[obj.type] = (types[obj.type] || 0) + 1;
    });
    return types;
  }

  calculateComplexity(objects) {
    // Simple complexity score based on object count and variety
    const typeCount = new Set(objects.map(obj => obj.type)).size;
    return objects.length * typeCount;
  }
}
```

---

## Advanced Automation Patterns

### 7. Workflow Orchestration

Combine multiple automation steps into complex workflows.

```javascript
class WorkflowOrchestrator {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
    this.workflows = new Map();
    this.executionQueue = [];
  }

  defineWorkflow(name, steps) {
    this.workflows.set(name, {
      name,
      steps,
      created: new Date(),
      executions: 0
    });
  }

  async executeWorkflow(name, context = {}) {
    const workflow = this.workflows.get(name);
    if (!workflow) throw new Error(`Workflow ${name} not found`);

    const execution = {
      id: `exec_${Date.now()}`,
      workflow: name,
      context,
      startTime: new Date(),
      steps: [],
      status: 'running'
    };

    try {
      for (const [index, step] of workflow.steps.entries()) {
        const stepExecution = await this.executeStep(step, context, execution);
        execution.steps.push(stepExecution);
        
        // Update context with step results
        if (stepExecution.output) {
          Object.assign(context, stepExecution.output);
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      workflow.executions++;

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      throw error;
    }

    return execution;
  }

  async executeStep(step, context, execution) {
    const stepExecution = {
      name: step.name,
      type: step.type,
      startTime: new Date(),
      input: { ...context }
    };

    try {
      switch (step.type) {
        case 'create_canvas':
          stepExecution.output = await this.client.createCanvas(
            step.params.name || context.canvasName
          );
          break;

        case 'ai_generation':
          stepExecution.output = await this.executeAIStep(
            context.canvasId,
            step.params.prompt,
            context
          );
          break;

        case 'api_operation':
          stepExecution.output = await this.executeAPIStep(
            step.params.operation,
            step.params.data,
            context
          );
          break;

        case 'external_call':
          stepExecution.output = await this.executeExternalStep(
            step.params.url,
            step.params.method,
            step.params.data,
            context
          );
          break;

        case 'conditional':
          const condition = this.evaluateCondition(step.params.condition, context);
          if (condition) {
            stepExecution.output = await this.executeWorkflow(
              step.params.trueWorkflow,
              context
            );
          } else if (step.params.falseWorkflow) {
            stepExecution.output = await this.executeWorkflow(
              step.params.falseWorkflow,
              context
            );
          }
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepExecution.status = 'completed';
      stepExecution.endTime = new Date();

    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = error.message;
      stepExecution.endTime = new Date();
      throw error;
    }

    return stepExecution;
  }
}

// Define complex workflow
const orchestrator = new WorkflowOrchestrator('your_token');

orchestrator.defineWorkflow('data_visualization_pipeline', [
  {
    name: 'fetch_data',
    type: 'external_call',
    params: {
      url: 'https://api.example.com/data',
      method: 'GET'
    }
  },
  {
    name: 'create_canvas',
    type: 'create_canvas',
    params: {
      name: 'Auto-Generated Chart'
    }
  },
  {
    name: 'generate_chart',
    type: 'ai_generation',
    params: {
      prompt: 'Create a bar chart with the fetched data'
    }
  },
  {
    name: 'refine_styling',
    type: 'api_operation',
    params: {
      operation: 'batch_update',
      data: { style: 'professional' }
    }
  },
  {
    name: 'notify_completion',
    type: 'external_call',
    params: {
      url: 'https://hooks.slack.com/webhook',
      method: 'POST'
    }
  }
]);

// Execute workflow
const result = await orchestrator.executeWorkflow('data_visualization_pipeline', {
  dataSource: 'sales_data',
  style: 'corporate'
});
```

---

## Performance Optimization

### Best Practices for Workflow Performance

1. **Batch Operations**: Use batch APIs when possible
2. **Rate Limit Management**: Implement intelligent queuing
3. **Caching**: Cache frequently used data
4. **Error Recovery**: Implement retry logic with exponential backoff
5. **Monitoring**: Track workflow performance and failures

```javascript
class OptimizedWorkflow {
  constructor(apiToken) {
    this.client = new CollabCanvasClient(apiToken);
    this.rateLimiter = new RateLimiter(50, 60000); // 50 requests per minute
    this.cache = new Map();
  }

  async optimizedBatchCreate(canvasId, objects, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < objects.length; i += batchSize) {
      const batch = objects.slice(i, i + batchSize);
      
      // Wait for rate limit
      await this.rateLimiter.wait();
      
      try {
        const result = await this.client.createObjectsBatch(canvasId, batch);
        results.push(...result.objects);
      } catch (error) {
        if (error.message.includes('429')) {
          // Rate limited - wait and retry
          await new Promise(resolve => setTimeout(resolve, 60000));
          i -= batchSize; // Retry this batch
        } else {
          throw error;
        }
      }
    }

    return results;
  }
}
```

---

## See Also

- [API Reference](./reference.md) - Complete API documentation
- [AI Agent Usage Guide](../ai-agent/usage-guide.md) - AI agent patterns
- [Code Examples](./examples.md) - Implementation examples
- [Rate Limits Guide](./rate-limits.md) - Rate limiting strategies
- [Authentication Guide](./authentication.md) - Security best practices
