# Client Guide: How to Edit Your Website

Welcome! Your website is built on a modern, high-performance platform called Cloudflare. Unlike slow website builders (like Wix or WordPress), this site runs directly on the "edge" of the internet, making it incredibly fast.

To keep it fast and secure, we edit the content directly in the source repository. Don't worry—it's as easy as editing a text document.

## 🚀 How to Edit Text (Prices, Headlines, FAQ)

### Step 1: Login
Go to **[GitHub.com](https://github.com)** and log in with your account.

### Step 2: Go to the File
Navigate to your website's file folder:
👉 **[Click Here to Open the Public Folder](https://github.com/kayla-collab/donna/tree/main/public)**

You will see a list of files. The two most important are:
*   `index.html` = The **Home Page** (Hero section, How it Works, Quiz)
*   `pricing.html` = The **Pricing Page** (Plans, FAQ, Comparison Table)

### Step 3: Start Editing
1.  Click on the file you want to edit (e.g., `index.html`).
2.  Look for the **Pencil Icon** ✏️ in the top right corner of the file view. Click it.
3.  You are now in "Edit Mode".

### Step 4: Find and Change Your Text
The file looks like code, but the **content** is plain text.
*   Press `Ctrl + F` (Windows) or `Cmd + F` (Mac) to open the search bar.
*   Type the text you want to change (e.g., "888" or "Start Your Free Walkthrough").
*   Delete the old text and type your new text.

> **⚠️ CAUTION:** Only change the black text between the tags.
> *   ✅ **Do this:** `<h1>New Headline Here</h1>`
> *   ❌ **Don't do this:** `<h1 class="New Headline Here">Old Headline</h1>` (Don't touch the parts inside `< >`)

### Step 5: Save (Publish)
1.  Scroll to the very bottom of the page.
2.  You will see a box labeled **"Commit changes"**.
3.  Type a short message describing what you did (e.g., "Updated pricing to $997").
4.  Click the green **Commit changes** button.

**🎉 Done!** Cloudflare will automatically detect your save and update the live website in about 1-2 minutes.

---

## 🤖 How to Update Clarity AI (The Chatbot)

You can change Clarity's "Personality" and basic knowledge instructions.

1.  Go to this file: 👉 **[worker/clarity-worker.js](https://github.com/kayla-collab/donna/blob/main/worker/clarity-worker.js)**
2.  Click the **Pencil Icon** ✏️.
3.  Look at the top for the section `const DEFAULT_PROMPT = ...`.
4.  Edit the text inside the backticks (` `). This is exactly what the AI reads.
5.  Click **Commit changes** to save.

---

## 🖼️ How to Swap Images

1.  Rename your new image on your computer to match the exact name of the old image (e.g., `dashboard-mockup.png`).
    *   *Note: File names are case-sensitive! `Image.png` is different from `image.png`.*
2.  Go to the **[images folder](https://github.com/kayla-collab/donna/tree/main/public/images)** on GitHub.
3.  Click the **"Add file"** button (top right) -> **"Upload files"**.
4.  Drag and drop your new image into the window.
5.  Scroll down and click **Commit changes**.
6.  The new image will replace the old one automatically.

---

## 🆘 Need Help?
If you see an error message or the site looks "broken" after an edit:
1.  Don't panic! We have a "Time Machine" (Version Control).
2.  Contact your developer. We can revert the site to the previous version instantly with one click.
