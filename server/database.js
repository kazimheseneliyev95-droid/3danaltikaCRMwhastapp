const { Pool } = require('pg');

// Database Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Database connected');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});

// Initialize database tables
async function initDb() {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(255),
      last_message TEXT,
      source_message TEXT,
      source_contact_name VARCHAR(255),
      whatsapp_id VARCHAR(255),
      status VARCHAR(20) DEFAULT 'new',
      source VARCHAR(50) DEFAULT 'whatsapp',
      value DECIMAL(10, 2) DEFAULT 0,
      product_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_created_at ON leads(created_at);
  `;

    try {
        await pool.query(createTableQuery);
        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new lead
 */
async function createLead(data) {
    const {
        phone,
        name,
        last_message,
        source_message,
        source_contact_name,
        whatsapp_id,
        status = 'new',
        source = 'whatsapp',
        value = 0,
        product_name
    } = data;

    const query = `
    INSERT INTO leads (
      phone, name, last_message, source_message, source_contact_name,
      whatsapp_id, status, source, value, product_name
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (phone) DO NOTHING
    RETURNING *;
  `;

    const values = [
        phone, name, last_message, source_message, source_contact_name,
        whatsapp_id, status, source, value, product_name
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creating lead:', error);
        throw error;
    }
}

/**
 * Find lead by phone number
 */
async function findLeadByPhone(phone) {
    const query = 'SELECT * FROM leads WHERE phone = $1';

    try {
        const result = await pool.query(query, [phone]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error finding lead:', error);
        throw error;
    }
}

/**
 * Update lead (smart update: only message and timestamp, keep status)
 */
async function updateLeadMessage(phone, message, whatsappId) {
    const query = `
    UPDATE leads
    SET last_message = $1, 
        whatsapp_id = $2,
        updated_at = NOW()
    WHERE phone = $3
    RETURNING *;
  `;

    try {
        const result = await pool.query(query, [message, whatsappId, phone]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error updating lead message:', error);
        throw error;
    }
}

/**
 * Update lead status (separate from message updates)
 */
async function updateLeadStatus(id, status) {
    const query = `
    UPDATE leads
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;

    try {
        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error updating lead status:', error);
        throw error;
    }
}

/**
 * Get all leads with optional filters
 */
async function getLeads(filters = {}) {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.status) {
        query += ` AND status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
    }

    if (filters.startDate) {
        query += ` AND created_at >= $${paramCount}`;
        values.push(filters.startDate);
        paramCount++;
    }

    if (filters.endDate) {
        query += ` AND created_at <= $${paramCount}`;
        values.push(filters.endDate);
        paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
    }

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        console.error('❌ Error getting leads:', error);
        throw error;
    }
}

/**
 * Delete lead
 */
async function deleteLead(id) {
    const query = 'DELETE FROM leads WHERE id = $1 RETURNING *';

    try {
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error deleting lead:', error);
        throw error;
    }
}

/**
 * Get lead statistics
 */
async function getLeadStats() {
    const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'new') as new,
      COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
      COUNT(*) FILTER (WHERE status = 'won') as won,
      COUNT(*) FILTER (WHERE status = 'lost') as lost,
      SUM(value) FILTER (WHERE status = 'won') as total_won_value
    FROM leads;
  `;

    try {
        const result = await pool.query(query);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error getting lead stats:', error);
        throw error;
    }
}

module.exports = {
    pool,
    initDb,
    createLead,
    findLeadByPhone,
    updateLeadMessage,
    updateLeadStatus,
    getLeads,
    deleteLead,
    getLeadStats
};
