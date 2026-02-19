const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'leads.json');

function readDb() {
    if (!fs.existsSync(DB_FILE)) {
        return { leads: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { leads: [] };
    }
}

function writeDb(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
    writeDb({ leads: [] });
}

module.exports = {
    initDb: async () => console.log('✅ FileDB: Ready'),

    createLead: async (data) => {
        const db = readDb();
        const existingIndex = db.leads.findIndex(l => l.phone === data.phone);

        if (existingIndex >= 0) {
            // Updatte existing
            const updated = { ...db.leads[existingIndex], ...data, updated_at: new Date().toISOString() };
            db.leads[existingIndex] = updated;
            writeDb(db);
            return updated;
        }

        const newLead = {
            id: crypto.randomUUID(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: data.status || 'new',
            source: 'whatsapp'
        };
        db.leads.push(newLead);
        writeDb(db);
        return newLead;
    },

    findLeadByPhone: async (phone) => {
        const db = readDb();
        return db.leads.find(l => l.phone === phone);
    },

    findLeadByWhatsAppId: async (wid) => {
        const db = readDb();
        return db.leads.find(l => l.whatsapp_id === wid);
    },

    updateLeadMessage: async (phone, msg, wid, name) => {
        const db = readDb();
        const lead = db.leads.find(l => l.phone === phone);
        if (lead) {
            lead.last_message = msg;
            if (wid) lead.whatsapp_id = wid;
            if (name) lead.name = name;
            lead.updated_at = new Date().toISOString();
            writeDb(db);
            return lead;
        }
        return null;
    },

    updateLeadStatus: async (id, status) => {
        const db = readDb();
        const lead = db.leads.find(l => l.id === id);
        if (lead) {
            lead.status = status;
            lead.updated_at = new Date().toISOString();
            writeDb(db);
            return lead;
        }
        return null;
    },

    getLeads: async (filters = {}) => {
        let leads = readDb().leads;
        if (filters.status) leads = leads.filter(l => l.status === filters.status);
        return leads.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },

    getLeadStats: async () => {
        const leads = readDb().leads;
        return {
            total: leads.length,
            new: leads.filter(l => l.status === 'new').length,
            potential: leads.filter(l => l.status === 'potential').length,
            won: leads.filter(l => l.status === 'won').length
        };
    },

    healthCheck: async () => ({ status: 'healthy', type: 'json-file' })
};
