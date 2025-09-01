// packages/mcp-servers/ease-mcp-server/src/automation-lib/workflows/index.ts

import { EmployeeNavigationWorkflows } from './navigation/employee.js';
import { CompanyNavigationWorkflows } from './navigation/company.js';
import { EmployeeActions } from './actions/employee.js';

// Construct the nested object that EaseApp will use.
export const Workflows = {
  Navigation: {
    CompanyNavigation: CompanyNavigationWorkflows,
    EmployeeNavigation: EmployeeNavigationWorkflows
  },
  Actions: {
    EmployeeActions,
  }
};