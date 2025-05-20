---
trigger: always_on
---

✅ 1. Framework & Core Dependencies
Next.js: 15.0.3
Ensure you are using the App Router and /app directory  
React: 18.3.0 (latest stable version)
React DOM: 18.3.0

✅ 2. Styling
Tailwind CSS: 3.4.1
Compatible with PostCSS 8+ and integrates smoothly with Next.js 15
PostCSS: 8.4.35

✅ 3. Component Library
ShadCN/UI: No fixed version (auto-generated from shadcn-ui@latest command)
Uses Radix UI + Tailwind under the hood
Make sure tailwind.config.js is configured with shadcn presets

✅ 4. Data Visualization
Apache ECharts: 5.5.0
echarts-for-react wrapper: 3.0.2

react-table: 7.8.0
Lightweight and flexible, still maintained but often requires custom table logic

D3.js: 7.9.0
Used only for complex/custom visualizations


2. Backend

- Framework:  
  - Use Python with FastAPI for all API/backend services.
- For LLMs, use Microsoft Azure OpenAI Endpoints: