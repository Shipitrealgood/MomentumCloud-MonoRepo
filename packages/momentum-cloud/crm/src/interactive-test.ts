import readline from 'readline/promises';
import { AccountService } from './services/accountService.js';
import { ContactService } from './services/contactService.js';

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("--- Interactive CRM Service Tester ---");
  console.log("Commands: create-account, find-account, search-account, create-contact, find-contact, exit");

  while (true) {
    const command = (await rl.question('> ')).toLowerCase();

    switch (command) {
      case 'exit':
        rl.close();
        console.log("Exiting CRM tester.");
        return;

      case 'create-account':
        try {
          const name = await rl.question('Account Name: ');
          const type = await rl.question('Account Type (BUSINESS or HOUSEHOLD): ');
          const newAccount = await AccountService.createAccount({
            name,
            type: type.toUpperCase() === 'BUSINESS' ? 'BUSINESS' : 'HOUSEHOLD',
          });
          console.log("✅ Success! Created account:", newAccount);
        } catch (error: any) {
          console.error("❌ Error:", error.message);
        }
        break;

      case 'find-account':
        try {
          const id = await rl.question('Account ID to find: ');
          const account = await AccountService.findAccountById(id);
          console.log(account ? `✅ Found account: ${JSON.stringify(account, null, 2)}` : "🟡 Account not found.");
        } catch (error: any) {
          console.error("❌ Error:", error.message);
        }
        break;

      // --- NEW COMMAND ---
      case 'search-account':
        try {
          const name = await rl.question('Account name to search for: ');
          const accounts = await AccountService.findAccountsByName(name);
          if (accounts.length > 0) {
            console.log(`✅ Found ${accounts.length} account(s):`);
            console.log(JSON.stringify(accounts, null, 2));
          } else {
            console.log("🟡 No accounts found matching that search.");
          }
        } catch (error: any) {
          console.error("❌ Error:", error.message);
        }
        break;

      case 'create-contact':
        try {
            const accountId = await rl.question('Account ID to link contact to: ');
            const firstName = await rl.question('First Name: ');
            const lastName = await rl.question('Last Name: ');
            const recordTypeStr = await rl.question('Record Type (EMPLOYEE or INDIVIDUAL): ');
            const recordType = recordTypeStr.toUpperCase() === 'EMPLOYEE' ? 'EMPLOYEE' : 'INDIVIDUAL';

            if (recordType === 'EMPLOYEE') {
                console.log('--- Entering Employee Details ---');
                const hireDate = await rl.question('Hire Date (YYYY-MM-DD): ');
                const newContact = await ContactService.createContact({
                    accountId,
                    firstName,
                    lastName,
                    profile: {
                        recordType: 'EMPLOYEE',
                        hireDate: new Date(hireDate),
                        employmentType: 'FULL_TIME',
                        compensationType: 'SALARY',
                        compensationAmount: 50000, // Example value
                    }
                });
                 console.log(`✅ Success! Created employee contact: ${JSON.stringify(newContact, null, 2)}`);
            } else { // INDIVIDUAL
                 console.log('--- Entering Individual Details ---');
                 const relationship = await rl.question('Relationship (SPOUSE, CHILD, etc.): ');
                 const newContact = await ContactService.createContact({
                     accountId,
                     firstName,
                     lastName,
                     profile: {
                         recordType: 'INDIVIDUAL',
                         relationship: relationship.toUpperCase() as any,
                     }
                 });
                 console.log(`✅ Success! Created individual contact: ${JSON.stringify(newContact, null, 2)}`);
            }
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }
        break;
    
      case 'find-contact':
        try {
            const id = await rl.question('Contact ID to find: ');
            const contact = await ContactService.findContactById(id);
            console.log(contact ? `✅ Found contact: ${JSON.stringify(contact, null, 2)}` : "🟡 Contact not found.");
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }
        break;

      default:
        console.log("Unknown command.");
    }
    console.log("\n---------------------------------------\n");
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});