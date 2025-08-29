import readline from 'readline/promises';
import { AccountService } from './services/accountService.js';
import { ContactService } from './services/contactService.js';
import { Prisma } from '@prisma/client';  // For Decimal if needed
import { parse, isValid } from 'date-fns';  // Updated to use parse for flexible formats

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("--- CRM CLI UI (Base Interface) ---");
  console.log("Commands: help, create-account, find-account, search-account, create-contact, search-contact, find-contact, list-contacts, exit");

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