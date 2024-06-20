const { test, expect, beforeEach, describe } = require('@playwright/test')
const {loginWith, createBlog} = require('./helper')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('/api/testing/reset')
    await request.post('/api/users',{
      data: {
        name: 'mluukkai',
        username: 'mluukkai',
        password: 'superuser'
      }
    })
    await request.post('/api/users', {
      data: {
        name: 'otheruser',
        username: 'otheruser',
        password: 'password'
      }
    })
    await page.goto('')
  })

  test('Login form is shown', async ({ page }) => {
    const locator = page.getByText('Log in to application')
    await expect(locator).toBeVisible()
  })

  describe('Login', ()=>{
    test('succeeds with correct credentials', async({ page }) => {
      await loginWith(page, 'mluukkai', 'superuser')
      await expect(page.getByText('mluukkai Logged in')).toBeVisible()
    })

    test('fails with wrong credentials', async({ page }) => {
      await loginWith(page, 'mlukkai', 'wrong')
      await expect(page.getByText('mluukkai Logged in')).not.toBeVisible()
    })
  })

  describe('when logged in', () => {
    beforeEach(async({page}) => {
      await loginWith(page, 'mluukkai', 'superuser')
    })

    test('a new blog can be created', async({ page }) => {
      await createBlog(page, 'Things I know', 'Dan', 'https://things-iknow.com/')
      await expect(page.getByText('Things I know')).toBeVisible()
    })

    test('blog can be liked', async ({ page }) => {
      await createBlog(page, 'Things I know', 'Dan', 'https://things-iknow.com/')
      await page.getByRole('button', { name: 'view' }).click()
      const likeCountLocator = page.locator('.blogDetails div:nth-of-type(2)')
      const initialLikeCount = parseInt(await likeCountLocator.textContent().then(text => text.match(/(\d+)/)[0]))
      await page.getByRole('button', { name: 'Like' }).click()
      // Wait for a brief moment to ensure the like count updates
      await page.waitForTimeout(500)
      // Get the updated like count
      const updatedLikeCount = parseInt(await likeCountLocator.textContent().then(text => text.match(/(\d+)/)[0]))
      // Verify that the like count has increased by 1
      expect(updatedLikeCount).toBe(initialLikeCount + 1)
    })

    test('blog can be deleted', async ({ page }) => {
      await createBlog(page, 'Things I know', 'Dan', 'https://things-iknow.com/');
      await page.getByRole('button', {name: 'view'}).click()
      page.on('dialog', dialog => dialog.accept());
      await page.getByRole('button', {name: 'remove'}).click();
      await expect(page.getByText('Things I know')).not.toBeVisible()
    });
    
    test('only the user who added the blog sees the delete button', async ({ page }) => {
      await createBlog(page, 'Things I know', 'Dan', 'https://things-iknow.com/');
      await expect(page.getByText('Things I know')).toBeVisible();
      await page.getByRole('button', { name: 'view' }).click();
      await expect(page.getByRole('button', { name: 'remove' })).toBeVisible();

      await page.getByText('logout').click();
      await loginWith(page, 'otheruser', 'password');
      
      await page.getByRole('button', { name: 'view' }).click();
      await expect(page.getByRole('button', { name: 'remove' })).not.toBeVisible();
    });
  })
})