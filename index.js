// Railway Entry Point Proxy
// This file exists because Railway looks for index.js by default
console.log('🔄 Loading server from server/index.cjs...');

import('./server/index.cjs')
    .then(() => console.log('✅ Server loaded successfully'))
    .catch(err => {
        console.error('❌ Failed to load server:', err);
        process.exit(1);
    });
