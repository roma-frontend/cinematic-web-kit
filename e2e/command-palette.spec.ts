import { test, expect } from '@playwright/test';

test.describe('command palette accessibility', () => {
  test('opens with the keyboard and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: /command|команд|palette/i }).first();
    await expect(trigger).toHaveAttribute('data-command-palette-ready', 'true');
    const hasVisibleTrigger = await trigger.isVisible();

    if (hasVisibleTrigger) await trigger.focus();
    else await page.locator('body').focus();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    if (hasVisibleTrigger) await expect(trigger).toBeFocused();
  });
});
