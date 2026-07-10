import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DBManager {
  constructor() {
    this.collections = {};
  }

  // Load a collection from disk, or initialize empty
  _getCollection(name) {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    if (!this.collections[name]) {
      if (fs.existsSync(filePath)) {
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          this.collections[name] = JSON.parse(data);
        } catch (err) {
          console.error(`Error parsing JSON database file ${name}.json:`, err);
          this.collections[name] = [];
        }
      } else {
        this.collections[name] = [];
        this._saveCollection(name);
      }
    }
    return this.collections[name];
  }

  // Save collection to disk synchronously (safest for simplicity)
  _saveCollection(name) {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    const tempPath = `${filePath}.tmp`;
    try {
      const data = JSON.stringify(this.collections[name], null, 2);
      fs.writeFileSync(tempPath, data, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error(`Failed to write database file ${name}.json:`, err);
      throw err;
    }
  }

  // Find all items matching a query object
  find(collectionName, query = {}) {
    const items = this._getCollection(collectionName);
    return items.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  // Find one item matching a query object
  findOne(collectionName, query = {}) {
    const items = this._getCollection(collectionName);
    return items.find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  }

  // Insert a document, generating a unique ID and created/updated times
  insert(collectionName, doc) {
    const items = this._getCollection(collectionName);
    const newDoc = {
      _id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };
    items.push(newDoc);
    this._saveCollection(collectionName);
    return newDoc;
  }

  // Update documents matching a query object
  update(collectionName, query = {}, updateData = {}) {
    const items = this._getCollection(collectionName);
    let updatedCount = 0;
    const updatedItems = [];

    this.collections[collectionName] = items.map(item => {
      let matches = true;
      for (const key in query) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        updatedCount++;
        const updated = {
          ...item,
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        updatedItems.push(updated);
        return updated;
      }
      return item;
    });

    if (updatedCount > 0) {
      this._saveCollection(collectionName);
    }
    return updatedItems;
  }

  // Delete documents matching query
  delete(collectionName, query = {}) {
    const items = this._getCollection(collectionName);
    const initialLength = items.length;
    
    const filteredItems = items.filter(item => {
      let matches = true;
      for (const key in query) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      return !matches;
    });

    const deletedCount = initialLength - filteredItems.length;
    if (deletedCount > 0) {
      this.collections[collectionName] = filteredItems;
      this._saveCollection(collectionName);
    }
    return deletedCount;
  }
}

const db = new DBManager();

// Seed initial database state if empty
const seedDatabase = () => {
  // 1. Seed default subjects
  const defaultSubjects = db.find('subjects', { isGlobal: true });
  if (defaultSubjects.length === 0) {
    const globalSubjects = [
      { name: 'Mathematics', description: 'Algebra, calculus, geometry, and equations.', difficulty: 'Hard', isGlobal: true },
      { name: 'Physics', description: 'Mechanics, electromagnetism, optics, and thermodynamics.', difficulty: 'Hard', isGlobal: true },
      { name: 'Computer Science', description: 'Algorithms, data structures, and programming concepts.', difficulty: 'Medium', isGlobal: true },
      { name: 'Chemistry', description: 'Organic, inorganic, and physical chemistry.', difficulty: 'Medium', isGlobal: true },
      { name: 'English Literature', description: 'Poetry, prose, grammar, and essay writing.', difficulty: 'Easy', isGlobal: true }
    ];
    globalSubjects.forEach(sub => db.insert('subjects', sub));
    console.log('Seeded global subjects.');
  }

  // 2. Seed Admin user if not exists
  const admin = db.findOne('users', { role: 'admin' });
  if (!admin) {
    // Generate hashed password for admin: password is 'admin123'
    const passwordHash = crypto.createHash('sha256').update('admin123').digest('hex');
    db.insert('users', {
      name: 'Global Administrator',
      email: 'admin@planner.com',
      password: passwordHash,
      role: 'admin'
    });
    console.log('Seeded administrator user (admin@planner.com / admin123).');
  }

  // 3. Seed Website Settings
  const settings = db.findOne('settings', {});
  if (!settings) {
    db.insert('settings', {
      homepageText: 'Optimize your study hours, track assignments, log Pomodoro sprints, and get AI-powered study tips inside the Smart Study Planner.',
      heroTitle: 'Unlock Your Smartest Study Schedule.',
      heroSubtitle: 'Optimize your daily study sessions in IST. Track priorities, schedule tasks around exams, study with Pomodoro sprints, and get real-time AI suggestions for weak subjects.',
      siteName: 'StudySpark',
      timeFormat: '12h',
      isLightModeDefault: true,
      siteBranding: 'Spark your plan. Light up your grades.🚀'
    });
    console.log('Seeded website settings.');
  }
};

seedDatabase();

export default db;
