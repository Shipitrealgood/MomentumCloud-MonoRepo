import { Page, Locator } from 'playwright';

/**
 * This file contains a library of hard-coded finder functions. Each function is
 * responsible for locating a specific UI element on the employee's profile page
 * and returning a Playwright Locator object for it.
 */

/**
 * Finds the locator for the employee's Birth Date field.
 * This function now includes the necessary navigation to the correct tab.
 * @param page The Playwright Page object, already navigated to the employee's main profile page.
 * @returns A Playwright Locator object pointing to the birth date field.
 */
export async function findBirthDateField(page: Page): Promise<Locator> {
    // Step 1: Navigate to the correct tab on the employee's profile.
    await page.getByRole('link', { name: 'Profile' }).click();
    
    // Step 2: Click the 'Personal' sub-tab to ensure the correct information is visible.
    await page.getByRole('link', { name: 'Personal' }).click();

    // Step 3: Return the new, more robust locator.
    // This finds the row, then finds the textbox inside it.
    return page.locator('#birthdateRow').getByRole('textbox');
}

/**
 * Finds the locator for the employee's Social Security Number field.
 * It handles clicking the "Show" button to reveal the SSN.
 * @param page The Playwright Page object, already navigated to the employee's profile.
 * @returns A Playwright Locator object pointing to the SSN value field.
 */
export async function findSSNField(page: Page): Promise<Locator> {
    // Ensure we are on the correct tab first.
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.getByRole('link', { name: 'Personal' }).click();

    // Step 1: Click the "Show" button to reveal the SSN.
    await page.getByText('SSN Show').click();

    // Step 2: Now that the SSN is visible, return the locator for the value itself.
    // This locator was provided from the Playwright Inspector.
    return page.locator('#ssnRow div').nth(1);
}

// Add other finder functions here. They should return Locators, not text.
// For example:
// export async function findEmailField(page: Page): Promise<Locator> {
//     await page.getByRole('link', { name: 'Profile' }).click();
//     await page.getByRole('link', { name: 'Personal' }).click();
//     return page.locator('#emailRow div').first(); // Example locator
// }