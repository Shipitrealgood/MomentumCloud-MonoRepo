import readline from 'readline/promises';
import { AccountService } from './services/accountService.js';
import { ContactService } from './services/contactService.js';
import { PolicyService } from './services/policyService.js';
import { CarrierService } from './services/carrierService.js';
import { EnrollmentService } from './services/enrollmentService.js';
import { Prisma } from '../prisma/generated/client/index.js';
import { parse, isValid } from 'date-fns';

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("--- CRM CLI UI (Base Interface) ---");
  console.log("Commands: help, create-account, find-account, search-account, create-contact, search-contact, find-contact, list-contacts, create-carrier, find-carrier, create-policy, find-policy, list-policies, create-enrollment, find-enrollment, list-enrollments, terminate-enrollment, exit");

  while (true) {
    const command = (await rl.question('> ')).trim().toLowerCase();

    if (command === 'exit') {
      rl.close();
      console.log("Exiting CRM CLI.");
      return;
    }

    if (command === 'help') {
      console.log(`
Available Commands:
- create-account: Create a new account.
- find-account: Find an account by ID.
- search-account: Search accounts by name.
- create-contact: Create a new contact (Employee or Individual).
- search-contact: Search contacts by name.
- find-contact: Find a contact by ID.
- list-contacts: List contacts for an account (search by account name first).
- create-carrier: Create a new carrier.
- find-carrier: Find a carrier by name.
- create-policy: Create a new policy.
- find-policy: Find a policy by ID.
- list-policies: List policies for an account.
- create-enrollment: Enroll a contact in a policy.
- find-enrollment: Find an enrollment by ID.
- list-enrollments: List enrollments for a contact.
- terminate-enrollment: Terminate an enrollment.
- exit: Quit the CLI.
      `);
      continue;
    }

    try {
      switch (command) {
        case 'create-account': {
          const name = await rl.question('Account Name: ');
          const typeInput = await rl.question('Type (Business or Household): ');
          const type = typeInput.toUpperCase();
          const newAccount = await AccountService.createAccount({ name, type: type === 'BUSINESS' ? 'BUSINESS' : 'HOUSEHOLD' });
          console.log("✅ Created account:", newAccount);
          break;
        }

        case 'find-account': {
          const accountId = await rl.question('Account ID: ');
          const account = await AccountService.findAccountById(accountId);
          console.log(account ? `✅ Account: ${JSON.stringify(account, null, 2)}` : "🟡 Not found.");
          break;
        }

        case 'search-account': {
          const searchName = await rl.question('Name to search: ');
          const accounts = await AccountService.findAccountsByName(searchName);
          console.log(accounts.length > 0 ? `✅ Found: ${JSON.stringify(accounts, null, 2)}` : "🟡 No matches.");
          break;
        }

        case 'create-contact': {
          // Dynamic account lookup
          const accountSearch = await rl.question('Account name to search: ');
          const foundAccounts = await AccountService.findAccountsByName(accountSearch);
          if (foundAccounts.length === 0) {
            console.log("🟡 No accounts found. Try creating one first.");
            break;
          }
          console.log("Found accounts:");
          foundAccounts.forEach((acc, index) => console.log(`${index + 1}: ${acc.name} (ID: ${acc.id})`));
          const choice = parseInt(await rl.question('Select account number (or 0 to cancel): '), 10);
          if (choice === 0) {
            console.log("Canceled.");
            break;
          }
          const selectedAccount = foundAccounts[choice - 1];
          if (!selectedAccount) {
            console.log("❌ Invalid choice.");
            break;
          }
          const accId = selectedAccount.id;

          const first = await rl.question('First Name: ');
          const last = await rl.question('Last Name: ');
          const typeStrInput = await rl.question('Type (Employee/Individual): ');
          const typeStr = typeStrInput.toLowerCase();
          const contactType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);

          let profileData: any = { type: contactType };

          if (contactType === 'Employee') {
            let hireDateInput = await rl.question('Hire Date (recommended, formats: YYYY-MM-DD, MM/DD/YYYY, etc.): ');
            let hireDate: Date | undefined;
            while (hireDateInput.trim()) {
              hireDate = parse(hireDateInput, 'yyyy-MM-dd', new Date());  // Try YYYY-MM-DD
              if (!isValid(hireDate)) hireDate = parse(hireDateInput, 'MM/dd/yyyy', new Date());  // Try MM/DD/YYYY
              if (!isValid(hireDate)) hireDate = parse(hireDateInput, 'M/d/yyyy', new Date());  // Try M/D/YYYY
              if (isValid(hireDate)) break;
              console.log("❌ Invalid hire date. Try again or leave blank.");
              hireDateInput = await rl.question('Hire Date (recommended, formats: YYYY-MM-DD, MM/DD/YYYY, etc.): ');
            }
            profileData.hireDate = hireDate;

            profileData.employmentType = (await rl.question('Employment Type (Full_Time, Part_Time, Contractor, default: Full_Time): ')).trim() || 'Full_Time';
            profileData.compensationType = (await rl.question('Compensation Type (Salary, Hourly, default: Salary): ')).trim() || 'Salary';
            profileData.compensationAmount = new Prisma.Decimal((await rl.question('Compensation Amount (default: 50000): ')).trim() || '50000');
            profileData.title = (await rl.question('Title (optional): ')).trim() || undefined;
            profileData.eid = (await rl.question('Employee ID (optional): ')).trim() || undefined;
          } else if (contactType === 'Individual') {
            const rel = await rl.question('Relationship (e.g., Spouse): ');
            profileData.relationship = rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase().replace(/ /g, '_') as any;
          } else {
            console.log("❌ Invalid type.");
            break;
          }

          const newContact = await ContactService.createContact({
            accountId: accId,
            firstName: first,
            lastName: last,
            profile: profileData,
          });
          console.log("✅ Created contact:", newContact);
          break;
        }

        case 'search-contact': {
          const searchContactName = await rl.question('Name to search (first or last): ');
          const searchedContacts = await ContactService.searchContactsByName(searchContactName);
          console.log(searchedContacts.length > 0 ? `✅ Found contacts: ${JSON.stringify(searchedContacts, null, 2)}` : "🟡 No matches.");
          break;
        }

        case 'find-contact': {
          const contactId = await rl.question('Contact ID: ');
          const contact = await ContactService.findContactById(contactId);
          console.log(contact ? `✅ Contact: ${JSON.stringify(contact, null, 2)}` : "🟡 Not found.");
          break;
        }

        case 'list-contacts': {
          const accountSearchName = await rl.question('Account name to search: ');
          const foundAccounts = await AccountService.findAccountsByName(accountSearchName);
          if (foundAccounts.length === 0) {
            console.log("🟡 No accounts found.");
            break;
          }
          console.log("Found accounts:");
          foundAccounts.forEach((acc, index) => console.log(`${index + 1}: ${acc.name} (ID: ${acc.id})`));
          const choice = parseInt(await rl.question('Select account number: '), 10);
          const selectedAccount = foundAccounts[choice - 1];
          if (!selectedAccount) {
            console.log("❌ Invalid choice.");
            break;
          }
          const accountContacts = await ContactService.listContactsByAccount(selectedAccount.id);
          console.log(accountContacts.length > 0 ? `✅ Contacts for ${selectedAccount.name}: ${JSON.stringify(accountContacts, null, 2)}` : "🟡 No contacts.");
          break;
        }

        case 'create-carrier': {
            const name = await rl.question('Carrier Name: ');
            const website = await rl.question('Carrier Website (optional): ');
            const carrier = await CarrierService.findOrCreateCarrier({ name, website });
            console.log("✅ Carrier created or found:", carrier);
            break;
        }

        case 'find-carrier': {
            const name = await rl.question('Carrier Name to search: ');
            const carrier = await CarrierService.findCarrierByName(name);
            console.log(carrier ? `✅ Found: ${JSON.stringify(carrier, null, 2)}` : "🟡 No matches.");
            break;
        }

        case 'create-policy': {
            const accountSearch = await rl.question('Account name to assign policy to: ');
            let foundAccounts = await AccountService.findAccountsByName(accountSearch);
            if (foundAccounts.length === 0) {
                const createNew = await rl.question('No accounts found. Create a new one? (y/n): ');
                if (createNew.toLowerCase() !== 'y') {
                    console.log("Canceled.");
                    break;
                }
                const name = await rl.question('New Account Name: ');
                const typeInput = await rl.question('Type (Business or Household): ');
                const type = typeInput.toUpperCase();
                const newAccount = await AccountService.createAccount({ name, type: type === 'BUSINESS' ? 'BUSINESS' : 'HOUSEHOLD' });
                console.log("✅ Created account:", newAccount);
                foundAccounts = [newAccount];
            }
            
            console.log("Found accounts:");
            foundAccounts.forEach((acc, index) => console.log(`${index + 1}: ${acc.name} (ID: ${acc.id})`));
            const accChoice = parseInt(await rl.question('Select account number: '), 10);
            const selectedAccount = foundAccounts[accChoice - 1];
            if (!selectedAccount) {
                console.log("❌ Invalid choice.");
                break;
            }

            const carrierSearch = await rl.question('Carrier name for the policy: ');
            let carrier = await CarrierService.findCarrierByName(carrierSearch);
            if (!carrier) {
                const createNew = await rl.question('Carrier not found. Create a new one? (y/n): ');
                if (createNew.toLowerCase() !== 'y') {
                    console.log("Canceled.");
                    break;
                }
                const website = await rl.question('New Carrier Website (optional): ');
                carrier = await CarrierService.findOrCreateCarrier({ name: carrierSearch, website });
                console.log("✅ Carrier created:", carrier);
            }

            const policyName = await rl.question('Policy Name: ');
            const fundingType = (await rl.question('Funding Type (SELF_FUNDED, LEVEL_FUNDED, TRADITIONAL): ')).toUpperCase();
            const effectiveDate = await rl.question('Effective Date (YYYY-MM-DD): ');

            const policy = await PolicyService.createPolicy({
                accountId: selectedAccount.id,
                carrierId: carrier.id,
                policyName,
                fundingType: fundingType as any,
                effectiveDate,
            });
            console.log("✅ Policy created:", policy);
            break;
        }

        case 'find-policy': {
            const policyId = await rl.question('Policy ID: ');
            const policy = await PolicyService.findPolicyById(policyId);
            console.log(policy ? `✅ Policy: ${JSON.stringify(policy, null, 2)}` : "🟡 Not found.");
            break;
        }

        case 'list-policies': {
            const accountSearchName = await rl.question('Account name to search: ');
            const foundAccounts = await AccountService.findAccountsByName(accountSearchName);
            if (foundAccounts.length === 0) {
                console.log("🟡 No accounts found.");
                break;
            }
            console.log("Found accounts:");
            foundAccounts.forEach((acc, index) => console.log(`${index + 1}: ${acc.name} (ID: ${acc.id})`));
            const choice = parseInt(await rl.question('Select account number: '), 10);
            const selectedAccount = foundAccounts[choice - 1];
            if (!selectedAccount) {
                console.log("❌ Invalid choice.");
                break;
            }
            const policies = await PolicyService.listPoliciesByAccount(selectedAccount.id);
            console.log(policies.length > 0 ? `✅ Policies for ${selectedAccount.name}: ${JSON.stringify(policies, null, 2)}` : "🟡 No policies.");
            break;
        }

        case 'create-enrollment': {
            const contactSearch = await rl.question('Contact name to enroll: ');
            const contacts = await ContactService.searchContactsByName(contactSearch);
            if (contacts.length === 0) {
                console.log("🟡 No contacts found.");
                break;
            }
            console.log("Found contacts:");
            contacts.forEach((c, index) => console.log(`${index + 1}: ${c.firstName} ${c.lastName} (ID: ${c.id})`));
            const contactChoice = parseInt(await rl.question('Select contact number: '), 10);
            const selectedContact = contacts[contactChoice - 1];
            if (!selectedContact) {
                console.log("❌ Invalid choice.");
                break;
            }

            const policies = await PolicyService.listPoliciesByAccount(selectedContact.accountId);
             if (policies.length === 0) {
                console.log("🟡 No policies found for this contact's account.");
                break;
            }
            console.log("Available policies:");
            policies.forEach((p, index) => console.log(`${index + 1}: ${p.policyName} (ID: ${p.id})`));
            const policyChoice = parseInt(await rl.question('Select policy number: '), 10);
            const selectedPolicy = policies[policyChoice - 1];
            if (!selectedPolicy) {
                console.log("❌ Invalid choice.");
                break;
            }

            const status = (await rl.question('Election Status (ENROLLED, WAIVED): ')).toUpperCase();
            const effectiveDate = await rl.question('Effective Date (YYYY-MM-DD): ');

            const enrollment = await EnrollmentService.createEnrollment({
                contactId: selectedContact.id,
                policyId: selectedPolicy.id,
                status: status as any,
                effectiveDate,
            });
            console.log("✅ Enrollment created:", enrollment);
            break;
        }

        case 'find-enrollment': {
            const enrollmentId = await rl.question('Enrollment ID: ');
            const enrollment = await EnrollmentService.findEnrollmentById(enrollmentId);
            console.log(enrollment ? `✅ Enrollment: ${JSON.stringify(enrollment, null, 2)}` : "🟡 Not found.");
            break;
        }

        case 'list-enrollments': {
            const contactSearch = await rl.question('Contact name to list enrollments for: ');
            const contacts = await ContactService.searchContactsByName(contactSearch);
            if (contacts.length === 0) {
                console.log("🟡 No contacts found.");
                break;
            }
            console.log("Found contacts:");
            contacts.forEach((c, index) => console.log(`${index + 1}: ${c.firstName} ${c.lastName} (ID: ${c.id})`));
            const contactChoice = parseInt(await rl.question('Select contact number: '), 10);
            const selectedContact = contacts[contactChoice - 1];
            if (!selectedContact) {
                console.log("❌ Invalid choice.");
                break;
            }

            const enrollments = await EnrollmentService.listEnrollmentsByContact(selectedContact.id);
            console.log(enrollments.length > 0 ? `✅ Enrollments for ${selectedContact.firstName} ${selectedContact.lastName}: ${JSON.stringify(enrollments, null, 2)}` : "🟡 No enrollments.");
            break;
        }

        case 'terminate-enrollment': {
            const enrollmentId = await rl.question('Enrollment ID to terminate: ');
            const terminationDate = await rl.question('Termination Date (YYYY-MM-DD): ');
            const enrollment = await EnrollmentService.terminateEnrollment(enrollmentId, terminationDate);
            console.log("✅ Enrollment terminated:", enrollment);
            break;
        }

        default:
          console.log("Unknown command. Try 'help'.");
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }

    console.log("\n---");
  }
}

main().catch(e => console.error(e));