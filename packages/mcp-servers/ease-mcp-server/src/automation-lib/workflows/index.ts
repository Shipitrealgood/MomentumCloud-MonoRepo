// packages/mcp-servers/ease-mcp-server/src/automation-lib/workflows/index.ts

// Import the consolidated workflow class from its correct location.
import { EmployeeNavigationWorkflows } from './navigation/employee.js';

// Construct the nested object that EaseApp will use.
export const Workflows = {
  Navigation: {
    // Expose the consolidated class under a consistent name.
    EmployeeNavigation: EmployeeNavigationWorkflows
  }
  // When we add actions, we will import them and add them here in the same way.
};