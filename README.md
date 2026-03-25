# Toggle App — Shopify Product Widget Manager
 
A Shopify embedded app that lets you enable or disable a custom widget per product using a boolean metafield (`custom.widget_enabled`).
 
---
 
## 🚀 Setup Steps
 
### Prerequisites
- Node.js v18+
- npm or yarn
- A [Shopify Partner account](https://partners.shopify.com)
- A Shopify development store
 
### 1. Clone the Repository
 
```bash
git clone https://github.com/hamzaazamm/Toggle-App.git
cd Toggle-App
```
 
### 2. Install Dependencies
 
```bash
npm install
```

## 🛒 How to Install on a Dev Store
 
1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com)
2. Click **Apps** → **Create App** → **Create app manually**
3. Set the **App URL** and **Allowed redirection URLs** to your tunnel URL (e.g. ngrok)
4. Copy the **API Key** and **API Secret** into your `.env` file
5. Run the app:
 
```bash
npm run dev
```
 
6. In the Partner Dashboard, click **Test on development store**
7. Select your dev store and install the app
8. You will be redirected to the embedded app inside your Shopify Admin
 
---
 
## 🧪 How to Test the Product Toggle
 
1. Open the app from your Shopify Admin — you will see a list of your products
2. Each product row has an **Enable / Disable** button
3. Click **Enable** on any product — the button will show a loading state and then switch to **Disable**
4. A toast notification will confirm the change
5. Refresh the page — the toggle state will persist (saved as a metafield)
