// packages/mcp-servers/ease-mcp-server/src/automation-lib/workflows/index.ts

// Import all the specific workflow classes we want to expose.
import { EmployeeNavigation } from './navigation/employee.js';
import { BenefitsNavigation } from './navigation/benefits.js'; // <-- The missing import

// We construct the nested object ourselves, which is much clearer for the compiler.
export const Workflows = {
  Navigation: {
    EmployeeNavigation,
    BenefitsNavigation  // <-- Add the new class to the export object
  }
  // When we add actions, we will import them and add them here in the same way.
};