self.addEventListener('install', (e) => {
    console.log('[CodeMaster] App Installed Successfully!');
});
self.addEventListener('fetch', (e) => {
    // PWA bypass to keep it simple and trigger install
});
